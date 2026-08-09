# Disaster Recovery & Restore Test Procedure

## Backup strategy

| Component | Method | Retention |
|-----------|--------|-----------|
| PostgreSQL | Automated RDS snapshots | 7 days staging / 35 days production |
| S3 assets | Versioning + lifecycle (enable in prod module) | Per org policy |
| Terraform state | S3 + DynamoDB lock | Indefinite |
| Secrets | Secrets Manager versioning | 30 days |

## RTO / RPO targets (initial)

| Metric | Target |
|--------|--------|
| RPO | ≤ 1 hour (RDS PITR) |
| RTO | ≤ 4 hours (full region rebuild) |

## Restore test (quarterly)

1. **Schedule** with operator approval — use staging clone, never production without change window
2. Restore RDS snapshot to new instance in staging VPC
3. Point staging ECS tasks at restored endpoint via temporary secret
4. Run smoke tests: login, list resources, open workspace
5. Verify audit log continuity and AI job table integrity
6. Document duration and issues in runbook ticket
7. Tear down restored instance

## Region failure

Primary region: **eu-west-2**. Multi-region active-active is out of scope for launch.

Failover procedure (manual):

1. Declare SEV1
2. Provision DR stack from Terraform in secondary region (future module)
3. Restore latest cross-region snapshot if configured
4. Update DNS / Clerk / Stripe webhook URLs

## Data export for customers

Portable JSON bundle via domain export API (M4+) — not a substitute for RDS restore.
