import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { after } from 'next/server';
import { triggerVideoProcessing } from './worker';

export interface ProcessingJobPayload {
  videoId: string;
  ownerId: string | null;
  source: 'youtube' | 'upload';
}

const queueUrl = process.env.SQS_VIDEO_QUEUE_URL;
const sqsClient = queueUrl
  ? new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
  : null;

export async function enqueueVideoProcessingJob(payload: ProcessingJobPayload): Promise<void> {
  const shouldBypassQueue =
    process.env.NODE_ENV === 'development' ||
    process.env.MOCK_QUEUE === 'true' ||
    !queueUrl ||
    !sqsClient;

  if (shouldBypassQueue) {
    if (process.env.VERCEL === '1') {
      after(async () => {
        try {
          await triggerVideoProcessing(payload);
        } catch (error) {
          console.error('[VideoProcessor] Background job failed', error);
        }
      });
      return;
    }

    await triggerVideoProcessing(payload);
    return;
  }

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(payload),
  });

  await sqsClient.send(command);
}
