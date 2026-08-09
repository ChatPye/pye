/** Provider-neutral AI types — no cloud SDK imports in this package. */

export type AiCapability =
  | 'video.structured_analysis'
  | 'video.tutor_chat'
  | 'document.analysis'
  | 'agent.growth_plan_draft'
  | 'agent.evidence_analysis'
  | 'agent.review_summary';

export type AiProviderId = 'gemini' | 'bedrock' | 'azure_foundry' | 'vertex';

export type AiJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'dead_letter';

export type SourceReference = {
  type: 'youtube_url' | 's3_key' | 'page' | 'timestamp' | 'web_url';
  label: string;
  ref: string;
};

export type AiUsageRecord = {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs: number;
};

export type AiJobRecord = {
  id: string;
  capability: AiCapability;
  provider: AiProviderId;
  model: string;
  promptVersion: string;
  status: AiJobStatus;
  organisationId?: string | null;
  userId?: string | null;
  resourceId?: string | null;
  usage?: AiUsageRecord;
  sourceReferences: SourceReference[];
  errorCode?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
};

export type StructuredAnalysisRequest = {
  capability: 'video.structured_analysis';
  sourceType: 'youtube' | 'video_upload' | 'pdf' | 'web_url';
  sourceRef: string;
  titleHint?: string;
  organisationId?: string;
  userId?: string;
};

export type TutorChatRequest = {
  capability: 'video.tutor_chat';
  sourceType: 'youtube' | 'video_upload';
  sourceRef: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  contextArtefact?: string;
  organisationId?: string;
  userId?: string;
};

export type AgentRequest = {
  capability: 'agent.growth_plan_draft' | 'agent.evidence_analysis' | 'agent.review_summary';
  payload: Record<string, unknown>;
  organisationId?: string;
  userId?: string;
};

export type AiRequest = StructuredAnalysisRequest | TutorChatRequest | AgentRequest;

export type AiResponse<T = unknown> = {
  ok: true;
  data: T;
  provider: AiProviderId;
  model: string;
  promptVersion: string;
  usage: AiUsageRecord;
  sourceReferences: SourceReference[];
};

export type AiErrorResponse = {
  ok: false;
  userMessage: string;
  code: string;
  retryable: boolean;
  provider?: AiProviderId;
};

export type AiResult<T = unknown> = AiResponse<T> | AiErrorResponse;

export interface AiProvider {
  readonly id: AiProviderId;
  supports(capability: AiCapability, sourceType?: string): boolean;
  healthCheck(): Promise<{ healthy: boolean; detail?: string }>;
  invoke<T>(request: AiRequest): Promise<AiResult<T>>;
}

export type RoutingContext = {
  environment: 'local' | 'preview' | 'staging' | 'production';
  capability: AiCapability;
  sourceType?: string;
  organisationId?: string;
  userId?: string;
  estimatedInputSize?: number;
};

export type OrganisationAiPolicy = {
  allowedProviders: AiProviderId[];
  preferProvider?: AiProviderId;
  maxDailyCostUsd?: number;
  blockWhenUnhealthy?: boolean;
};

export type ProviderHealthState = {
  provider: AiProviderId;
  consecutiveFailures: number;
  circuitOpen: boolean;
  lastCheckedAt: Date;
  lastError?: string;
};

export const PROMPT_VERSION = '2026.08.1';

export const USER_SAFE_FALLBACK =
  'Pye is temporarily unavailable for this request. Your work is saved — please try again in a few minutes.';
