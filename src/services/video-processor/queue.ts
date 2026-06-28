import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { startVideoProcessing } from '@/services/video-processor/staged-worker';
import { triggerBackgroundProcessing } from '@/lib/video/trigger-processing';
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

  await startVideoProcessing(payload);

  if (shouldBypassQueue) {
    await triggerBackgroundProcessing(
      payload.videoId,
      payload.source,
      payload.ownerId
    );
    return;
  }

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(payload),
  });

  await sqsClient.send(command);
  await triggerBackgroundProcessing(
    payload.videoId,
    payload.source,
    payload.ownerId
  );
}
