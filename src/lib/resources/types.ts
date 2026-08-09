export const RESOURCE_SOURCE_TYPES = [
  'youtube',
  'pdf',
  'web_url',
  'video_upload',
  'org_resource',
] as const;

export type ResourceSourceType = (typeof RESOURCE_SOURCE_TYPES)[number];

export const RESOURCE_PROCESSING_STATES = [
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
] as const;

export type ResourceProcessingState = (typeof RESOURCE_PROCESSING_STATES)[number];

export const RESOURCE_VISIBILITY = [
  'private',
  'manager_named',
  'plan',
  'org_reviewer',
  'public_link',
] as const;

export type ResourceVisibility = (typeof RESOURCE_VISIBILITY)[number];

export type ResourceRecord = {
  id: string;
  ownerUserId: string;
  organisationId?: string | null;
  sourceType: ResourceSourceType;
  sourceRef: string;
  title: string;
  description?: string | null;
  displayMetadata: Record<string, unknown>;
  processingState: ResourceProcessingState;
  visibility: ResourceVisibility;
  failureCode?: string | null;
  failureMessage?: string | null;
  artefact?: Record<string, unknown> | null;
  legacyExternalId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ResourceProcessingJob = {
  id: string;
  resourceId: string;
  state: ResourceProcessingState;
  attempt: number;
  maxAttempts: number;
  provider?: string | null;
  lastError?: string | null;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
};
