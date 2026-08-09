# RBAC Matrix — ChatPye Workspace

**Model:** Action-based permissions · **Enforcement:** Server-side only  
**ADR:** `docs/adr/006-rbac-model.md`

## Roles

| Role | Description |
|------|-------------|
| `org_admin` | Organisation administrator |
| `manager` | Creates Growth Plans, assigns learning, reviews evidence |
| `reviewer` | Reviews evidence/competencies without full plan admin |
| `employee` | Learns, submits evidence, controls visibility |
| `billing_admin` | Manages subscription and seats |
| `personal_user` | Non-org personal workspace (implicit role) |

Clerk provides organisation **membership**; application DB stores **role assignments** per org.

## Permissions

| Permission key | Description |
|----------------|-------------|
| `org.manage` | Update org settings |
| `org.members.manage` | Invite/remove members |
| `org.billing.manage` | Stripe portal, seats |
| `plans.create` | Create Growth Plans |
| `plans.assign` | Assign plans to employees |
| `plans.publish` | Publish plan to employee |
| `evidence.review` | Accept/decline/request revision |
| `records.view` | View permitted employee records |
| `competency.framework.manage` | Manage competency frameworks |
| `audit.view` | View organisation audit log |
| `resources.manage` | Org-wide resource library |

## Role → permission matrix

| Permission | org_admin | manager | reviewer | employee | billing_admin |
|------------|:---------:|:-------:|:--------:|:--------:|:-------------:|
| org.manage | ✓ | | | | |
| org.members.manage | ✓ | ✓ | | | |
| org.billing.manage | ✓ | | | | ✓ |
| plans.create | ✓ | ✓ | | | |
| plans.assign | ✓ | ✓ | | | |
| plans.publish | ✓ | ✓ | | | |
| evidence.review | ✓ | ✓ | ✓ | | |
| records.view | ✓ | ✓* | ✓* | self | |
| competency.framework.manage | ✓ | | | | |
| audit.view | ✓ | | | | |
| resources.manage | ✓ | ✓ | | | |

\*Manager/reviewer: only employees on their plans or review queue.

## Visibility rules (orthogonal to RBAC)

| Visibility | Who can read |
|------------|--------------|
| `private` | Owner only |
| `manager_named` | Owner + named manager |
| `plan` | Owner + plan managers/reviewers |
| `org_reviewer` | Owner + assigned reviewers |
| `public_link` | Anyone with valid token |

Employees always see visibility badge on assigned work.

## Server authorisation pattern

```typescript
await authorize({
  action: 'evidence.review',
  userId,
  organisationId,
  resourceId: evidenceId,
});
```

Every org-owned query MUST include `organisationId` from server-resolved session — never from client body alone.

## Baseline gaps

- [ ] No `organisation_memberships` table wired
- [ ] HR access via `hr-auth.ts` + `DEV_HR_ROLE` bypass
- [ ] Admin platform uses separate Clerk metadata RBAC (`admin-rbac.ts`)
- [ ] No audit log for permission checks

## Implementation milestones

| Milestone | RBAC deliverable |
|-----------|------------------|
| M1 | Personal user only; resource ownership checks |
| M3 | Full org RBAC + invitations |
| M4 | Evidence review permissions + audit |
| M5 | Billing admin role + entitlement gates |
