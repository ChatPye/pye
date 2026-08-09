import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/** Portable PostgreSQL extensions — cloud-neutral system of record. */

export const aiJobStatusEnum = pgEnum('ai_job_status', [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'dead_letter',
]);

export const auditEventTypeEnum = pgEnum('audit_event_type', [
  'ai.job.started',
  'ai.job.completed',
  'ai.job.failed',
  'evidence.submitted',
  'evidence.reviewed',
  'assertion.created',
  'assertion.reviewed',
  'share.created',
  'share.revoked',
  'export.requested',
  'export.completed',
  'admin.action',
  'consent.recorded',
]);

export const aiJobs = pgTable(
  'ai_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organisationId: uuid('organisation_id'),
    userId: varchar('user_id', { length: 255 }),
    resourceId: uuid('resource_id'),
    capability: varchar('capability', { length: 80 }).notNull(),
    provider: varchar('provider', { length: 40 }).notNull(),
    model: varchar('model', { length: 120 }).notNull(),
    promptVersion: varchar('prompt_version', { length: 40 }).notNull(),
    status: aiJobStatusEnum('status').notNull().default('queued'),
    inputRef: jsonb('input_ref').$type<Record<string, unknown>>().default({}),
    outputRef: jsonb('output_ref').$type<Record<string, unknown>>(),
    sourceReferences: jsonb('source_references').$type<
      Array<{ type: string; label: string; ref: string }>
    >().default([]),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    estimatedCostUsd: varchar('estimated_cost_usd', { length: 24 }),
    latencyMs: integer('latency_ms'),
    errorCode: varchar('error_code', { length: 80 }),
    attempt: integer('attempt').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    deletedAt: timestamp('deleted_at'),
    retentionUntil: timestamp('retention_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    orgCreatedIdx: index('ai_jobs_org_created_idx').on(table.organisationId, table.createdAt),
    statusIdx: index('ai_jobs_status_idx').on(table.status),
  }),
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organisationId: uuid('organisation_id'),
    actorId: varchar('actor_id', { length: 255 }),
    type: auditEventTypeEnum('type').notNull(),
    resourceType: varchar('resource_type', { length: 80 }),
    resourceId: varchar('resource_id', { length: 255 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orgCreatedIdx: index('audit_events_org_created_idx').on(table.organisationId, table.createdAt),
    typeIdx: index('audit_events_type_idx').on(table.type),
  }),
);

export const dataRetentionPolicies = pgTable('data_retention_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  resourceKind: varchar('resource_kind', { length: 80 }).notNull(),
  retainDays: integer('retain_days').notNull(),
  softDelete: integer('soft_delete').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
