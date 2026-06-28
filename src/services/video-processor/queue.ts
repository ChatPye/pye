import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
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
    await triggerVideoProcessing(payload);
    return;
  }

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(payload),
  });

  await sqsClient.send(command);
}
