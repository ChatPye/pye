import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { loadServiceConfig } from '@chatpye/config';
import { initTelemetry, logError, logInfo } from '@chatpye/observability';
import { parseResourceProcessingMessage } from '@chatpye/config';

const config = loadServiceConfig('worker');
initTelemetry({ serviceName: 'chatpye-worker', environment: config.environment });

const POLL_WAIT_SECONDS = 20;
const VISIBILITY_TIMEOUT = 300;

async function dispatchToWebWorker(body: string): Promise<void> {
  const callbackUrl =
    process.env.WORKER_CALLBACK_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  const secret = process.env.CRON_SECRET;

  const message = parseResourceProcessingMessage(body);
  const url = `${callbackUrl.replace(/\/$/, '')}/api/resources/process/worker`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WORKER_CALLBACK_${response.status}: ${text.slice(0, 200)}`);
  }
}

async function pollQueue(sqs: SQSClient, queueUrl: string): Promise<void> {
  const result = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: POLL_WAIT_SECONDS,
      VisibilityTimeout: VISIBILITY_TIMEOUT,
    }),
  );

  for (const message of result.Messages ?? []) {
    if (!message.Body || !message.ReceiptHandle) continue;

    try {
      await dispatchToWebWorker(message.Body);
      await sqs.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );
      logInfo('Processed resource job from SQS', { messageId: message.MessageId });
    } catch (error) {
      logError(
        'Failed to process SQS message',
        error instanceof Error ? error : new Error(String(error)),
        { messageId: message.MessageId },
      );
    }
  }
}

async function main(): Promise<void> {
  logInfo('ChatPye worker started', {
    environment: config.environment,
    queueUrl: config.queueUrl ?? '(not configured)',
  });

  if (!config.queueUrl) {
    logInfo('SQS_QUEUE_URL not set — worker idle (local imports use in-process scheduling)');
    return;
  }

  const sqs = new SQSClient({ region: config.region });

  while (true) {
    await pollQueue(sqs, config.queueUrl);
  }
}

main().catch((error) => {
  logError('Worker fatal error', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
