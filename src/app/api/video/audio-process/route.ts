import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize AWS clients
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const s3Client = new S3Client({ region: 'us-east-1' });
const sesClient = new SESClient({ region: 'us-east-1' });

// YouTube audio extraction using ytdl-core
async function extractAudioFromYouTube(videoId: string): Promise<Buffer | null> {
  try {
    // This would use ytdl-core to extract audio
    // For now, we'll simulate this process
    console.log(`Extracting audio from YouTube video: ${videoId}`);
    
    // In a real implementation, you would:
    // 1. Use ytdl-core to get audio stream
    // 2. Convert to appropriate format (WAV/MP3)
    // 3. Return as Buffer
    
    // For demo purposes, return null to indicate no audio available
    return null;
  } catch (error) {
    console.error('Error extracting audio:', error);
    return null;
  }
}

// Chunk audio for processing
function chunkAudio(audioBuffer: Buffer, chunkSize: number = 25 * 1024 * 1024): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < audioBuffer.length; i += chunkSize) {
    chunks.push(audioBuffer.slice(i, i + chunkSize));
  }
  return chunks;
}

// Upload audio to S3
async function uploadAudioToS3(videoId: string, audioBuffer: Buffer): Promise<string> {
  try {
    const key = `audio/${videoId}/audio.wav`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'chatpye-audio',
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/wav'
    });
    
    await s3Client.send(command);
    return key;
  } catch (error) {
    console.error('Error uploading audio to S3:', error);
    throw error;
  }
}

// Process audio with Amazon Transcribe (simulated)
async function transcribeAudio(audioKey: string): Promise<any[]> {
  try {
    // In a real implementation, you would:
    // 1. Use Amazon Transcribe to convert audio to text
    // 2. Parse the transcript into segments with timestamps
    // 3. Return structured transcript data
    
    // For demo purposes, return mock transcript
    return [
      { text: "Welcome to this audio tutorial", start: 0, duration: 3 },
      { text: "Today we'll be learning about advanced concepts", start: 3, duration: 4 },
      { text: "Let's start with the basics", start: 7, duration: 3 },
      { text: "This is an important concept to understand", start: 10, duration: 4 },
      { text: "Now let's move to the advanced section", start: 14, duration: 5 },
      { text: "Thank you for listening", start: 19, duration: 2 }
    ];
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

// Send processing status email
async function sendProcessingEmail(email: string, videoId: string, status: string) {
  try {
    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL || 'noreply@chatpye.com',
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: `Video Processing ${status} - ChatPye`,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: `
              <h2>Video Processing ${status}</h2>
              <p>Your video <strong>${videoId}</strong> processing has ${status.toLowerCase()}.</p>
              <p>You can now ask questions about the video content in your ChatPye extension.</p>
              <p>Best regards,<br>The ChatPye Team</p>
            `,
            Charset: 'UTF-8'
          }
        }
      }
    });
    
    await sesClient.send(command);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { videoId, email } = await request.json();
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }
    
    // Check if video already has transcript
    const existingVideoResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/video/process?videoId=${videoId}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || ''
      }
    });
    
    if (existingVideoResponse.ok) {
      const existingVideo = await existingVideoResponse.json();
      if (existingVideo.video && existingVideo.video.transcript && existingVideo.video.transcript.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Video already has transcript',
          transcript: existingVideo.video.transcript
        });
      }
    }
    
    // Start audio processing
    console.log(`Starting audio processing for video: ${videoId}`);
    
    // Extract audio from YouTube
    const audioBuffer = await extractAudioFromYouTube(videoId);
    
    if (!audioBuffer) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract audio from video. Video may not have audio or may be restricted.'
      }, { status: 400 });
    }
    
    // Check if audio is too large (YouTube's 25MB limit for Whisper)
    if (audioBuffer.length > 25 * 1024 * 1024) {
      // Chunk the audio for processing
      const chunks = chunkAudio(audioBuffer);
      console.log(`Audio too large, processing in ${chunks.length} chunks`);
      
      // Process each chunk
      const allTranscripts = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkKey = `audio/${videoId}/chunk_${i}.wav`;
        await uploadAudioToS3(videoId, chunks[i]);
        
        const chunkTranscript = await transcribeAudio(chunkKey);
        allTranscripts.push(...chunkTranscript);
      }
      
      // Combine transcripts and update timestamps
      const combinedTranscript = allTranscripts.map((segment, index) => ({
        ...segment,
        start: index * 5, // Approximate timing
        duration: 5
      }));
      
      // Update video with transcript
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/video/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          videoId,
          transcript: combinedTranscript
        })
      });
      
      // Send completion email
      if (email) {
        await sendProcessingEmail(email, videoId, 'Completed');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Audio processed successfully',
        transcript: combinedTranscript,
        chunksProcessed: chunks.length
      });
      
    } else {
      // Process single audio file
      const audioKey = await uploadAudioToS3(videoId, audioBuffer);
      const transcript = await transcribeAudio(audioKey);
      
      // Update video with transcript
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/video/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          videoId,
          transcript
        })
      });
      
      // Send completion email
      if (email) {
        await sendProcessingEmail(email, videoId, 'Completed');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Audio processed successfully',
        transcript
      });
    }
    
  } catch (error) {
    console.error('Audio processing error:', error);
    
    // Send error email
    const { email, videoId } = await request.json().catch(() => ({}));
    if (email && videoId) {
      await sendProcessingEmail(email, videoId, 'Failed');
    }
    
    return NextResponse.json({
      success: false,
      error: 'Audio processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }
    
    // Check processing status
    const videoResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/video/process?videoId=${videoId}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || ''
      }
    });
    
    if (!videoResponse.ok) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    const video = await videoResponse.json();
    
    return NextResponse.json({
      success: true,
      hasTranscript: video.video?.transcript?.length > 0,
      processingStatus: video.video?.processingStatus || 'unknown',
      transcript: video.video?.transcript || []
    });
    
  } catch (error) {
    console.error('Audio status check error:', error);
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
}

