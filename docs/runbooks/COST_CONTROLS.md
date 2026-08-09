# Cost-Control Playbook

> **Do not create AWS Budgets or billable alarms without operator approval.**  
> This document defines controls; provisioning budgets is an explicit operator action.

## Mandatory tags

All Terraform modules apply:

| Tag | Value |
|-----|-------|
| Application | ChatPye |
| Environment | staging / production |
| Owner | platform-team |
| CostCentre | engineering |
| DataClassification | confidential |
| ManagedBy | Terraform |

## Staging cost reductions

- ECS **scale-to-zero** outside business hours (`desired_count = 0`)
- Smaller RDS/ElastiCache instance classes
- S3 lifecycle → STANDARD_IA after 90 days
- No public ALB/WAF in staging

## Production controls

- ECS autoscaling bounds (min 2, max N)
- SQS worker concurrency limits
- Gemini daily per-user caps + platform circuit breaker
- Bedrock token budgets per org plan
- Log retention: 30d staging / 90d production

## AI spend

| Provider | Control |
|----------|---------|
| Gemini YouTube | `FEATURE_GEMINI_YOUTUBE`, daily caps, preview pricing independence |
| Bedrock | Upload + agents only; monitor `ai_jobs.estimated_cost_usd` |

## Alerts (configure after operator approval)

- AWS Budgets at 50% / 80% / 100% of monthly forecast
- CloudWatch anomaly detection on Bedrock/Gemini proxy metrics
- SQS DLQ depth > 0 sustained

## Review cadence

Monthly cost review with engineering + finance; adjust caps before credits expire.
