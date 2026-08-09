# Deployment Procedure

## Preconditions

- [ ] Operator approval for infrastructure changes
- [ ] `main` branch green (type-check, unit tests, build)
- [ ] Staging smoke tests passed
- [ ] Database migration reviewed
- [ ] Rollback plan documented in deploy ticket

## CI/CD path

```text
GitHub (ChatPye/chatpye-web)
  → CodeStar Connection (CodeConnections)
  → CodePipeline
  → CodeBuild (buildspec: infra/buildspec.yml)
  → ECR push (web, api, worker)
  → ECS deploy (staging auto / production manual approval)
```

**No static AWS access keys.** CodeBuild and ECS tasks use IAM roles.

## Staging (auto on main)

1. Merge PR to `main`
2. Pipeline triggers automatically
3. Run smoke tests:
   - `GET /api/system/health`
   - YouTube import → job queued → workspace ready
   - Pye chat returns citation
4. Monitor CloudWatch alarms 30 minutes

## Production (manual approval)

1. Confirm staging sign-off
2. Approve **Manual Approval** stage in CodePipeline
3. ECS rolling deploy with health checks
4. Run production smoke tests (read-only + synthetic write in test org)
5. Watch error rate, SQS age, AI job failures 1 hour

## Rollback

1. ECS: revert task definition to previous image digest
2. Database: forward-only migrations preferred — restore from snapshot only if approved (see DISASTER_RECOVERY.md)
3. Feature flags: disable via Secrets Manager without redeploy

## Health checks

- Web: `/api/system/health`
- API service: `/health`
- Worker: queue consumer heartbeat metric (CloudWatch)

## Clerk & Stripe per environment

Update webhook URLs when deploying new environment base URL.
