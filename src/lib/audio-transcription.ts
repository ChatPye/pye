import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand, type MediaFormat } from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getTranscribeMediaFormat } from '@/lib/video-upload-utils';

// Audio Transcription Service for YouTube Extension
export class AudioTranscriptionService {
  private transcribeClient: TranscribeClient;
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';

    this.transcribeClient = new TranscribeClient({ region });
    this.s3Client = new S3Client({ region });
    
    this.bucketName =
      process.env.AWS_S3_BUCKET ||
      process.env.S3_BUCKET_NAME ||
      'chatpye-uploads';
  }

  // Extract audio from YouTube video and transcribe
  // audioUrlOrS3Key can be: YouTube audio URL, S3 key (for custom videos), or S3 URL
  async transcribeVideoAudio(videoId: string, audioUrlOrS3Key?: string): Promise<{
    transcript: string | Array<{ text: string; start: number; duration: number }>;
    confidence: number;
    processingTime: number;
    jobId: string;
  }> {
    const startTime = Date.now();

    try {
      let s3Key: string;

      if (audioUrlOrS3Key) {
        // Check if it's an S3 key (starts with 'videos/' or 'audio/')
        if (audioUrlOrS3Key.startsWith('videos/') || audioUrlOrS3Key.startsWith('audio/')) {
          // Already an S3 key - use directly
          s3Key = audioUrlOrS3Key;
        } else if (audioUrlOrS3Key.startsWith('http')) {
          // It's a URL - download and upload to S3
          const audioBuffer = await this.downloadAudio(audioUrlOrS3Key);
          s3Key = `audio/${videoId}/${Date.now()}.mp3`;
          await this.uploadAudioToS3(s3Key, audioBuffer);
        } else {
          // Assume it's an S3 key
          s3Key = audioUrlOrS3Key;
        }
      } else {
        // No URL provided - try to extract from YouTube video
        const audioUrl = await this.extractAudioUrl(videoId);
        const audioBuffer = await this.downloadAudio(audioUrl);
        s3Key = `audio/${videoId}/${Date.now()}.mp3`;
        await this.uploadAudioToS3(s3Key, audioBuffer);
      }

      // Start transcription job
      const jobId = `transcription-${videoId}-${Date.now()}`;
      await this.startTranscriptionJob(jobId, s3Key);

      // Wait for completion and get results
      const transcript = await this.waitForTranscriptionCompletion(jobId);
      
      const processingTime = Date.now() - startTime;

      return {
        transcript: transcript.segments.length > 0 ? transcript.segments : transcript.text,
        confidence: transcript.confidence,
        processingTime,
        jobId
      };

    } catch (error) {
      console.error('Audio transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  // Extract audio URL from YouTube video
  private async extractAudioUrl(videoId: string): Promise<string> {
    try {
      // Use youtube-dl or similar to extract audio URL
      // This is a simplified version - in production, you'd use a proper YouTube audio extraction service
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const html = await response.text();
      
      // Extract audio URL from YouTube page (simplified)
      // In production, use a proper YouTube audio extraction library
      const audioUrlMatch = html.match(/"audioUrl":"([^"]+)"/);
      if (audioUrlMatch) {
        return audioUrlMatch[1];
      }
      
      throw new Error('Could not extract audio URL');
    } catch (error) {
      console.error('Audio URL extraction error:', error);
      throw new Error('Failed to extract audio URL');
    }
  }

  // Download audio file
  private async downloadAudio(audioUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Audio download error:', error);
      throw new Error('Failed to download audio file');
    }
  }

  // Upload audio to S3
  private async uploadAudioToS3(key: string, audioBuffer: Buffer): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: audioBuffer,
        ContentType: 'audio/mpeg',
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload audio to S3');
    }
  }

  // Start AWS Transcribe job (returns immediately)
  async startJobForS3Key(
    videoId: string,
    s3Key: string,
    options?: { fastMode?: boolean }
  ): Promise<string> {
    const jobId = `transcription-${videoId}-${Date.now()}`;
    await this.startTranscriptionJob(jobId, s3Key, options);
    return jobId;
  }

  /** Poll job status without blocking for long periods. */
  async pollJob(jobId: string): Promise<{
    status: 'pending' | 'complete' | 'failed';
    segments?: Array<{ text: string; start: number; duration: number }>;
    text?: string;
    error?: string;
    confidence?: number;
  }> {
    return this.pollJobOnce(jobId);
  }

  /**
   * Poll until complete, failed, or timeout — use inside /process/tick (maxDuration 300s).
   * ChatYTT-style: do async work server-side, not one AWS poll per browser tick.
   */
  async pollJobUntilDone(
    jobId: string,
    options?: { maxWaitMs?: number; pollIntervalMs?: number }
  ): Promise<{
    status: 'pending' | 'complete' | 'failed';
    segments?: Array<{ text: string; start: number; duration: number }>;
    text?: string;
    error?: string;
    confidence?: number;
    waitedMs?: number;
  }> {
    const maxWaitMs = options?.maxWaitMs ?? 120_000;
    const pollIntervalMs = options?.pollIntervalMs ?? 4_000;
    const started = Date.now();

    while (Date.now() - started < maxWaitMs) {
      const result = await this.pollJobOnce(jobId);
      if (result.status !== 'pending') {
        return { ...result, waitedMs: Date.now() - started };
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return { status: 'pending', waitedMs: Date.now() - started };
  }

  private async pollJobOnce(jobId: string): Promise<{
    status: 'pending' | 'complete' | 'failed';
    segments?: Array<{ text: string; start: number; duration: number }>;
    text?: string;
    error?: string;
    confidence?: number;
  }> {
    try {
      const response = await this.transcribeClient.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobId })
      );
      const job = response.TranscriptionJob;

      if (job?.TranscriptionJobStatus === 'IN_PROGRESS' || job?.TranscriptionJobStatus === 'QUEUED') {
        return { status: 'pending' };
      }

      if (job?.TranscriptionJobStatus === 'FAILED') {
        return { status: 'failed', error: job.FailureReason || 'Transcription failed' };
      }

      if (job?.TranscriptionJobStatus === 'COMPLETED') {
        const transcriptKey = `transcripts/${jobId}.json`;
        const transcriptData = await this.getTranscriptFromS3(transcriptKey);
        const text = transcriptData.results?.transcripts?.[0]?.transcript ?? '';
        const segments = this.parseAwsTranscriptSegments(transcriptData);
        return {
          status: 'complete',
          segments,
          text,
          confidence: this.calculateAverageConfidence(transcriptData.results?.items),
        };
      }

      return { status: 'pending' };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Poll failed',
      };
    }
  }

  private async startTranscriptionJob(
    jobId: string,
    s3Key: string,
    options?: { fastMode?: boolean }
  ): Promise<void> {
    try {
      const fastMode = options?.fastMode ?? false;
      const command = new StartTranscriptionJobCommand({
        TranscriptionJobName: jobId,
        Media: {
          MediaFileUri: `s3://${this.bucketName}/${s3Key}`,
        },
        MediaFormat: getTranscribeMediaFormat(s3Key) as MediaFormat,
        LanguageCode: 'en-US',
        OutputBucketName: this.bucketName,
        OutputKey: `transcripts/${jobId}.json`,
        Settings: fastMode
          ? {
              ShowSpeakerLabels: false,
              ShowAlternatives: false,
            }
          : {
              ShowSpeakerLabels: true,
              MaxSpeakerLabels: 10,
              ShowAlternatives: true,
              MaxAlternatives: 3,
            },
      });

      await this.transcribeClient.send(command);
    } catch (error) {
      console.error('Transcription job start error:', error);
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to start AWS Transcribe: ${detail}`);
    }
  }

  // Wait for transcription completion
  private parseAwsTranscriptSegments(data: {
    results?: { items?: Array<Record<string, unknown>>; transcripts?: Array<{ transcript?: string }> };
  }): Array<{ text: string; start: number; duration: number }> {
    const items = data?.results?.items;
    if (!Array.isArray(items)) return [];

    const segments: Array<{ text: string; start: number; duration: number }> = [];
    let buffer = '';
    let segmentStart = 0;
    let lastEnd = 0;

    const flush = (endTime: number) => {
      const text = buffer.trim();
      if (!text) return;
      const start = segmentStart;
      const duration = Math.max(0.5, endTime - start);
      segments.push({ text, start, duration });
      buffer = '';
      segmentStart = endTime;
    };

    for (const item of items) {
      if (item.type !== 'pronunciation') continue;
      const alt = (item.alternatives as Array<{ content?: string }> | undefined)?.[0];
      const word = alt?.content?.trim();
      if (!word) continue;

      const start = parseFloat(String(item.start_time ?? '0'));
      const end = parseFloat(String(item.end_time ?? start));

      if (!buffer) segmentStart = start;
      buffer += `${buffer ? ' ' : ''}${word}`;
      lastEnd = end;

      if (buffer.length > 120) {
        flush(lastEnd);
      }
    }

    if (buffer) flush(lastEnd || segmentStart + 1);
    return segments;
  }

  private async waitForTranscriptionCompletion(jobId: string): Promise<{
    text: string;
    segments: Array<{ text: string; start: number; duration: number }>;
    confidence: number;
  }> {
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 10000; // 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const command = new GetTranscriptionJobCommand({
          TranscriptionJobName: jobId,
        });

        const response = await this.transcribeClient.send(command);
        const job = response.TranscriptionJob;

        if (job?.TranscriptionJobStatus === 'COMPLETED') {
          // Get transcript from S3
          const transcriptKey = `transcripts/${jobId}.json`;
          const transcriptData = await this.getTranscriptFromS3(transcriptKey);
          const text = transcriptData.results?.transcripts?.[0]?.transcript ?? '';
          const segments = this.parseAwsTranscriptSegments(transcriptData);

          return {
            text,
            segments,
            confidence: this.calculateAverageConfidence(transcriptData.results?.items),
          };
        } else if (job?.TranscriptionJobStatus === 'FAILED') {
          throw new Error(`Transcription job failed: ${job.FailureReason}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error('Transcription status check error:', error);
        throw new Error('Failed to check transcription status');
      }
    }

    throw new Error('Transcription job timed out');
  }

  // Get transcript from S3
  private async getTranscriptFromS3(key: string): Promise<any> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const body = await response.Body?.transformToString();
      
      if (!body) {
        throw new Error('Empty transcript response');
      }

      return JSON.parse(body);
    } catch (error) {
      console.error('S3 transcript retrieval error:', error);
      throw new Error('Failed to retrieve transcript from S3');
    }
  }

  // Calculate average confidence from transcription items
  private calculateAverageConfidence(items: any[]): number {
    if (!items || items.length === 0) return 0;

    const confidenceScores = items
      .filter(item => item.alternatives && item.alternatives[0])
      .map(item => item.alternatives[0].confidence || 0);

    if (confidenceScores.length === 0) return 0;

    const sum = confidenceScores.reduce((acc, score) => acc + score, 0);
    return sum / confidenceScores.length;
  }

  // Check if video has transcript available
  async checkTranscriptAvailability(videoId: string): Promise<{
    hasTranscript: boolean;
    source: 'youtube' | 'transcription' | 'none';
    transcript?: string;
  }> {
    try {
      // First, try to get YouTube transcript
      const youtubeTranscript = await this.getYouTubeTranscript(videoId);
      if (youtubeTranscript) {
        return {
          hasTranscript: true,
          source: 'youtube',
          transcript: youtubeTranscript,
        };
      }

      // Check if we have a stored transcription
      const storedTranscript = await this.getStoredTranscript(videoId);
      if (storedTranscript) {
        return {
          hasTranscript: true,
          source: 'transcription',
          transcript: storedTranscript,
        };
      }

      return {
        hasTranscript: false,
        source: 'none',
      };
    } catch (error) {
      console.error('Transcript availability check error:', error);
      return {
        hasTranscript: false,
        source: 'none',
      };
    }
  }

  // Get YouTube transcript (if available)
  private async getYouTubeTranscript(videoId: string): Promise<string | null> {
    try {
      // This would use the YouTube transcript API
      // For now, return null as we don't have the implementation
      return null;
    } catch (error) {
      console.error('YouTube transcript retrieval error:', error);
      return null;
    }
  }

  // Get stored transcription from database
  private async getStoredTranscript(videoId: string): Promise<string | null> {
    try {
      // This would query your database for stored transcriptions
      // For now, return null as we don't have the implementation
      return null;
    } catch (error) {
      console.error('Stored transcript retrieval error:', error);
      return null;
    }
  }
}

// Export the service
export const audioTranscriptionService = new AudioTranscriptionService();
