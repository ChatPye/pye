import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { loadServiceConfig } from '@chatpye/config';
import { logger } from '@/lib/logger';
import type { ResourceProcessingMessage } from '@/lib/queue/resource-processing-types';
import { scheduleResourceProcessing } from '@/lib/resources/schedule-processing';

const config = loadServiceConfig('web');
const sqsClient = config.queueUrl
  ? new SQSClient({ region: config.region })
  : null;

function shouldBypassQueue(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.MOCK_QUEUE === 'true' ||
    !config.queueUrl ||
    !sqsClient
  );
}

export async function enqueueResourceProcessingJob(
  message: ResourceProcessingMessage,
): Promise<'sqs' | 'local'> {
  if (shouldBypassQueue()) {
    scheduleResourceProcessing(message);
    return 'local';
  }

  await sqsClient!.send(
    new SendMessageCommand({
      QueueUrl: config.queueUrl,
      MessageBody: JSON.stringify(message),
    }),
  );

  logger.info('Resource processing job enqueued', {
    resourceId: message.resourceId,
    jobId: message.jobId,
  });

  return 'sqs';
}
