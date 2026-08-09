# Cost Controls — ChatPye Workspace

## Principles

Platform must remain viable after AWS credits expire.

## Controls

| Control | Implementation |
|---------|----------------|
| AI quotas | Per-plan limits in `usage_events` (M1+) |
| Gemini circuit breaker | Disable `FEATURE_GEMINI_YOUTUBE` on error rate |
| S3 lifecycle | Transition uploads to IA/Glacier per policy |
| Log retention | CloudWatch 30d staging / 90d prod |
| ECS autoscaling bounds | Min/max task count per environment |
| Budget alerts | AWS Budgets at 50/80/100% |

## Plan allowances (target)

| Plan | YouTube analyses/day | Bedrock tokens/month |
|------|---------------------|----------------------|
| Free | 3 | Low cap |
| Pro | 20 | Medium |
| Team | Org pool | High |
| Enterprise | Contract | Contract |

## Review cadence

Monthly cost review; anomaly detection on Bedrock and Gemini spend.
