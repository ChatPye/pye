import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { startVideoProcessing } from '@/services/video-processor/staged-worker';
import type { ProcessingJobPayload } from '@/services/video-processor/staged-worker';

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
    // Staged worker: start first tick only; client polls /api/video/process/tick
    await startVideoProcessing(payload);
    return;
  }

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(payload),
  });

  await sqsClient.send(command);
}
