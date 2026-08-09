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

export const resourceSourceTypeEnum = pgEnum('resource_source_type', [
  'youtube',
  'pdf',
  'web_url',
  'video_upload',
  'org_resource',
]);

export const resourceProcessingStateEnum = pgEnum('resource_processing_state', [
  'created',
  'validating',
  'queued',
  'processing_metadata',
  'analysing_content',
  'generating_learning_structure',
  'ready',
  'partially_ready',
  'failed',
  'deleted',
]);

export const resourceVisibilityEnum = pgEnum('resource_visibility', [
  'private',
  'manager_named',
  'plan',
  'org_reviewer',
  'public_link',
]);

/** Canonical learning resource — portable across clouds. */
export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: varchar('owner_user_id', { length: 255 }).notNull(),
    organisationId: uuid('organisation_id'),
    sourceType: resourceSourceTypeEnum('source_type').notNull(),
    sourceRef: text('source_ref').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    displayMetadata: jsonb('display_metadata').$type<Record<string, unknown>>().default({}),
    processingState: resourceProcessingStateEnum('processing_state').notNull().default('created'),
    visibility: resourceVisibilityEnum('visibility').notNull().default('private'),
    failureCode: varchar('failure_code', { length: 80 }),
    failureMessage: text('failure_message'),
    artefact: jsonb('artefact').$type<Record<string, unknown>>(),
    /** Maps to legacy `videos.external_id` during dual-write migration. */
    legacyExternalId: varchar('legacy_external_id', { length: 255 }).unique(),
    deletedAt: timestamp('deleted_at'),
    retentionUntil: timestamp('retention_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    ownerCreatedIdx: index('resources_owner_created_idx').on(table.ownerUserId, table.createdAt),
    orgCreatedIdx: index('resources_org_created_idx').on(table.organisationId, table.createdAt),
    stateIdx: index('resources_processing_state_idx').on(table.processingState),
    legacyExternalIdx: index('resources_legacy_external_idx').on(table.legacyExternalId),
  }),
);

export const resourceProcessingJobs = pgTable(
  'resource_processing_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    state: resourceProcessingStateEnum('state').notNull().default('queued'),
    attempt: integer('attempt').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    provider: varchar('provider', { length: 40 }),
    dlqRef: varchar('dlq_ref', { length: 255 }),
    lastError: text('last_error'),
    progressPercent: integer('progress_percent').notNull().default(0),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    resourceIdx: index('resource_processing_jobs_resource_idx').on(table.resourceId),
    stateIdx: index('resource_processing_jobs_state_idx').on(table.state),
  }),
);
