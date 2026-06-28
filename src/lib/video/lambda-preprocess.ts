import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { logger } from '@/lib/logger';
import type { MediaPrepResult } from '@/lib/video/media-prep';

const region = process.env.AWS_REGION || 'us-east-1';
const functionName =
  process.env.VIDEO_PREPROCESS_LAMBDA_ARN || process.env.VIDEO_PREPROCESS_LAMBDA_NAME;

export function isLambdaPreprocessConfigured(): boolean {
  return Boolean(functionName);
}

/**
 * Invoke ffmpeg Lambda to extract audio from video in S3.
 * Non-blocking timeout — falls back to original video key on failure.
 */
export async function invokeVideoPreprocessLambda(
  videoId: string,
  videoS3Key: string
): Promise<MediaPrepResult> {
  if (!functionName) {
    return { transcriptionKey: videoS3Key, usedAudioExtract: false };
  }

  const bucket =
    process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME || 'chatpye-uploads';

  const client = new LambdaClient({ region });

  try {
    logger.info('Invoking video preprocess Lambda', { videoId, functionName });

    const response = await client.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(
          JSON.stringify({ videoId, videoS3Key, bucket })
        ),
      })
    );

    if (response.FunctionError) {
      const raw = response.Payload ? Buffer.from(response.Payload).toString('utf8') : '';
      let detail = response.FunctionError;
      try {
        const parsed = JSON.parse(raw);
        detail = parsed.errorMessage || parsed.error || raw || detail;
      } catch {
        if (raw) detail = raw;
      }
      logger.warn('Lambda preprocess error', { videoId, error: detail });
      return { transcriptionKey: videoS3Key, usedAudioExtract: false };
    }

    const raw = response.Payload ? Buffer.from(response.Payload).toString('utf8') : '{}';
    const outer = JSON.parse(raw) as { statusCode?: number; body?: string };
    const inner = outer.body ? JSON.parse(outer.body) : outer;

    if (inner.transcriptionKey && inner.usedAudioExtract) {
      logger.info('Lambda audio extract complete', {
        videoId,
        audioKey: inner.transcriptionKey,
      });
      return {
        transcriptionKey: inner.transcriptionKey as string,
        usedAudioExtract: true,
      };
    }

    return { transcriptionKey: videoS3Key, usedAudioExtract: false };
  } catch (error) {
    logger.error(
      'Lambda preprocess invoke failed',
      error instanceof Error ? error : new Error(String(error)),
      { videoId }
    );
    return { transcriptionKey: videoS3Key, usedAudioExtract: false };
  }
}
