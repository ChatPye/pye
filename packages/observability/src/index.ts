export type TelemetryContext = {
  serviceName: string;
  environment: string;
};

let context: TelemetryContext | null = null;

/** OpenTelemetry bootstrap — wire @opentelemetry/sdk-node in production ECS tasks. */
export function initTelemetry(ctx: TelemetryContext): void {
  context = ctx;
}

export function logInfo(message: string, fields?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level: 'info', message, service: context?.serviceName, environment: context?.environment, ...fields, timestamp: new Date().toISOString() }));
}

export function logError(message: string, error?: Error, fields?: Record<string, unknown>): void {
  console.error(JSON.stringify({
    level: 'error',
    message,
    service: context?.serviceName,
    environment: context?.environment,
    error: error ? { name: error.name, message: error.message } : undefined,
    ...fields,
    timestamp: new Date().toISOString(),
  }));
}

export function auditEvent(event: {
  type: string;
  actorId?: string;
  organisationId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): void {
  console.log(JSON.stringify({ level: 'audit', ...event, timestamp: new Date().toISOString() }));
}
