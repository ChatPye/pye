export type ResourceProcessingMessage = {
  resourceId: string;
  jobId: string;
  sourceType: 'youtube';
  ownerUserId: string;
  organisationId?: string | null;
};

export function parseResourceProcessingMessage(body: string): ResourceProcessingMessage {
  const parsed = JSON.parse(body) as Partial<ResourceProcessingMessage>;
  if (
    typeof parsed.resourceId !== 'string' ||
    typeof parsed.jobId !== 'string' ||
    parsed.sourceType !== 'youtube' ||
    typeof parsed.ownerUserId !== 'string'
  ) {
    throw new Error('INVALID_RESOURCE_PROCESSING_MESSAGE');
  }
  return {
    resourceId: parsed.resourceId,
    jobId: parsed.jobId,
    sourceType: 'youtube',
    ownerUserId: parsed.ownerUserId,
    organisationId: parsed.organisationId ?? null,
  };
}
