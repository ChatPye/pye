# Runbook — ChatPye Workspace (Initial)

## Health checks

- `GET /api/system/health` — app liveness
- `GET /api/health` — legacy health route

## Common failures

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Processing stuck in `queued` | Worker/cron not running | Check SQS depth; trigger worker |
| Gemini quota errors | Daily limit / API outage | Surface user message; circuit breaker |
| 401 on workspace | Clerk misconfig | Verify keys; check middleware |
| Empty competencies | No DATABASE_URL | Configure Aurora; run `db:push` |

## Incidents

1. Capture `x-request-id` from API error
2. Search CloudWatch logs by requestId (production)
3. Check queue age alarms
4. Page on-call if Stripe/webhook failure rate spikes

## Backups

- Aurora automated backups (enable in CDK M5)
- Test restore quarterly
