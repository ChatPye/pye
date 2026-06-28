/**
 * Prepare upload media for faster transcription.
 * Extracts audio-only MP3 when ffmpeg is available (Lambda/Docker/EC2).
 * Transcribing audio is typically 3–5× faster than full video for long files.
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { extractAudioMp3Buffer, isFfmpegAvailable } from '@/lib/video/ffmpeg-processor';
import { invokeVideoPreprocessLambda, isLambdaPreprocessConfigured } from '@/lib/video/lambda-preprocess';
import { logger } from '@/lib/logger';

const region = process.env.AWS_REGION || 'us-east-1';
const bucket =
  process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME || 'chatpye-uploads';

function s3Client(): S3Client {
  return new S3Client({ region });
}

function extensionFromKey(key: string): string {
  const dot = key.lastIndexOf('.');
  return dot >= 0 ? key.slice(dot + 1).toLowerCase() : 'mp4';
}

async function downloadS3Object(key: string, maxBytes = 2_000_000_000): Promise<Buffer> {
  const client = s3Client();
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );

  if (!response.Body) {
    throw new Error('Empty S3 object');
  }

  const contentLength = response.ContentLength ?? 0;
  if (contentLength > maxBytes) {
    throw new Error(`Video too large for inline prep (${Math.round(contentLength / 1e6)}MB)`);
  }

  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function uploadAudioKey(videoId: string, buffer: Buffer): Promise<string> {
  const key = `audio/${videoId}/${Date.now()}.mp3`;
  const client = s3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'audio/mpeg',
    })
  );
  return key;
}

export type MediaPrepResult = {
  transcriptionKey: string;
  usedAudioExtract: boolean;
};

/**
 * Returns the S3 key best suited for AWS Transcribe.
 * Falls back to original video key when ffmpeg is unavailable (Vercel serverless).
 */
export async function prepareTranscriptionMedia(
  videoId: string,
  videoS3Key: string
): Promise<MediaPrepResult> {
  if (isFfmpegAvailable()) {
    try {
      logger.info('Extracting audio for faster transcription (local ffmpeg)', { videoId, videoS3Key });
      const videoBuffer = await downloadS3Object(videoS3Key);
      const ext = extensionFromKey(videoS3Key);
      const audioBuffer = await extractAudioMp3Buffer(videoBuffer, ext);

      if (audioBuffer && audioBuffer.length > 0) {
        const audioKey = await uploadAudioKey(videoId, audioBuffer);
        logger.info('Audio extracted for transcription', {
          videoId,
          audioKey,
          audioMb: Math.round(audioBuffer.length / 1e6),
        });
        return { transcriptionKey: audioKey, usedAudioExtract: true };
      }
    } catch (error) {
      logger.error(
        'Local media prep failed',
        error instanceof Error ? error : new Error(String(error)),
        { videoId }
      );
    }
  }

  if (isLambdaPreprocessConfigured()) {
    const lambdaResult = await invokeVideoPreprocessLambda(videoId, videoS3Key);
    if (lambdaResult.usedAudioExtract) {
      return lambdaResult;
    }
  }

  logger.info('Using original video for transcription (no ffmpeg/Lambda prep)', {
    videoId,
    videoS3Key,
  });
  return { transcriptionKey: videoS3Key, usedAudioExtract: false };
}
