/** Portable domain types — CASS-aligned, cloud-neutral. */

export type Visibility = 'private' | 'manager_named' | 'plan' | 'org_reviewer' | 'public_link';

export type EvidenceStatus =
  | 'draft'
  | 'submitted'
  | 'analysing'
  | 'ready_for_review'
  | 'accepted'
  | 'revision_requested'
  | 'declined'
  | 'withdrawn';

export type AssertionStatus =
  | 'ai_draft'
  | 'employee_review'
  | 'shared'
  | 'under_review'
  | 'accepted'
  | 'revision_requested'
  | 'declined'
  | 'withdrawn';

export type AuditEventType =
  | 'ai.job.started'
  | 'ai.job.completed'
  | 'ai.job.failed'
  | 'evidence.submitted'
  | 'evidence.reviewed'
  | 'assertion.created'
  | 'assertion.reviewed'
  | 'share.created'
  | 'share.revoked'
  | 'export.requested'
  | 'export.completed'
  | 'admin.action'
  | 'consent.recorded';

export type CompetencyAssertion = {
  id: string;
  organisationId?: string | null;
  userId: string;
  competencyId: string;
  levelId: string;
  version: number;
  statement: string;
  evidenceIds: string[];
  assessmentMethod: string;
  limitations?: string;
  aiConfidence?: number;
  humanReviewed: boolean;
  visibility: Visibility;
  expiresAt?: Date | null;
  status: AssertionStatus;
};

export type EvidenceRecord = {
  id: string;
  organisationId?: string | null;
  userId: string;
  taskId?: string | null;
  resourceId?: string | null;
  type: string;
  status: EvidenceStatus;
  visibility: Visibility;
  provenance: Record<string, unknown>;
};

export type AuditEvent = {
  id: string;
  organisationId?: string | null;
  actorId?: string | null;
  type: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

/** JSON export envelope for portability / future CaSS adapter. */
export type PortableExportBundle = {
  exportedAt: string;
  organisationId?: string;
  userId: string;
  assertions: CompetencyAssertion[];
  evidence: EvidenceRecord[];
  auditEvents: AuditEvent[];
};
