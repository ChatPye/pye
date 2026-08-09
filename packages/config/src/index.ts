export type ChatPyeEnvironment = 'local' | 'preview' | 'staging' | 'production';

export type ServiceName = 'web' | 'api' | 'worker';

export type ServiceConfig = {
  environment: ChatPyeEnvironment;
  port: number;
  region: string;
  queueUrl?: string;
  databaseUrl?: string;
  redisUrl?: string;
};

export function loadServiceConfig(service: ServiceName): ServiceConfig {
  const environment = (process.env.CHATPYE_ENV || process.env.NODE_ENV || 'local') as ChatPyeEnvironment;
  return {
    environment,
    port: Number(process.env.PORT || (service === 'web' ? 3000 : service === 'api' ? 8080 : 8081)),
    region: process.env.AWS_REGION || 'eu-west-2',
    queueUrl: process.env.SQS_QUEUE_URL,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
  };
}

export const REQUIRED_SECRETS = [
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'GEMINI_API_KEY',
] as const;

export type { ResourceProcessingMessage } from './queue.js';
export { parseResourceProcessingMessage } from './queue.js';

/** Secrets must come from Secrets Manager / CI secret store — never Git or client bundles. */
export function assertNoSecretsInClient(envKeys: string[]): string[] {
  return envKeys.filter((k) => k.startsWith('NEXT_PUBLIC_') && REQUIRED_SECRETS.some((s) => k.includes(s.replace('_', ''))));
}
