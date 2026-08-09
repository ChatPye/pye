# AWS Architecture — ChatPye Workspace (Target)

**IaC:** AWS CDK (TypeScript) — see `docs/adr/001-aws-cdk.md`  
**Environments:** development, staging, production (isolated accounts recommended)

## Production topology

```text
Route 53
   │
   ▼
CloudFront (+ ACM cert, AWS WAF)
   │
   ├── Static assets / SSR via ALB
   │
Application Load Balancer (public subnets)
   │
   ├── ECS Fargate Service: chatpye-web (Next.js container)
   └── ECS Fargate Service: chatpye-worker (resource processing)

Private subnets
   ├── Aurora PostgreSQL Serverless v2 (+ RDS Proxy optional)
   ├── ECS workers (no public IP)
   └── VPC endpoints (S3, SQS, Secrets Manager, ECR, Logs)

SQS
   ├── resource-processing-queue (+ DLQ)
   └── webhook-processing-queue (+ DLQ)

Lambda
   ├── clerk-webhook-handler
   ├── stripe-webhook-handler
   └── video-preprocess (existing, migrate)

S3
   ├── uploads bucket (private, KMS, lifecycle)
   └── evidence bucket (private, KMS)

Secrets Manager / SSM
   └── Clerk, Stripe, Gemini, Bedrock config

CloudWatch
   ├── Logs (JSON structured)
   ├── Metrics + dashboards
   └── Alarms → SNS

AWS Budgets + Cost Anomaly Detection
```

## Network

- VPC `/16` with 2 AZs
- Public subnets: ALB only
- Private subnets: ECS tasks, Aurora
- NAT Gateway: minimise — prefer VPC endpoints
- Security groups: least privilege per service

## ECS task definitions

### Web service

- CPU: 512–1024 (scale on CPU/RPS)
- Memory: 1024–2048
- Health check: `/api/system/health`
- Env from SSM; secrets from Secrets Manager

### Worker service

- Higher memory for PDF/video analysis
- Autoscale on `ApproximateNumberOfMessagesVisible`

## Database

- Aurora PostgreSQL Serverless v2
- Not publicly accessible
- Automated backups 7–35 days by environment
- Migration via Drizzle in CI deploy step

## CDN & security

- CloudFront origin: ALB
- WAF: AWSManagedRulesCommonRuleSet + rate-based rule
- Response headers policy: CSP, HSTS (align with `middleware.ts`)

## CI/CD

| Stage | Action |
|-------|--------|
| PR | lint, type-check, test, build, CDK synth |
| Merge to main | Deploy staging ECS |
| Manual approval | Deploy production + migrate DB |

## Baseline gap

No `infra/` stacks exist yet. Milestone 5 delivers CDK. Until then, Vercel + manual AWS scripts remain for development.

## Cost controls

See `docs/operations/COST_CONTROLS.md`.

## Future extension points

- Pye Desktop: API Gateway + mTLS auth for session artefacts
- Step Functions: only if multi-step orchestration exceeds SQS reliability needs
