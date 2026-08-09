# Incident Runbooks

## Severity levels

| SEV | Description | Response |
|-----|-------------|----------|
| SEV1 | Production down / data breach | Immediate, all-hands |
| SEV2 | Major feature broken | < 1 hour |
| SEV3 | Degraded performance | < 4 hours |
| SEV4 | Minor defect | Next business day |

## SEV1 — Production unavailable

1. Check CloudWatch dashboard `${name_prefix}-ops`
2. Verify ECS service health and ALB target groups
3. Check RDS connectivity from bastion/VPN (no public DB)
4. Review recent deploy in CodePipeline — **rollback** if correlated
5. Post status update; capture `x-request-id` samples

## AI provider outage

1. Check provider health: `/api/system/health` + `ai_jobs` failure rate
2. If Gemini quota/circuit open → user message already safe; verify Bedrock path for uploads
3. Toggle `FEATURE_GEMINI_YOUTUBE=false` via Secrets Manager if runaway cost
4. Scale worker concurrency down if queue backlog

## Queue backlog

1. Alarm: `ApproximateAgeOfOldestMessage` > 900s
2. Inspect DLQ messages
3. Scale worker tasks; fix poison messages; replay from DLQ after patch

## Credential compromise

1. Rotate affected Secrets Manager entries
2. Invalidate Clerk sessions if auth breach
3. Rotate Stripe webhook secret if billing affected
4. Review `audit_events` for exfiltration patterns

## Contacts

Document on-call rotation in internal wiki (not in Git).
