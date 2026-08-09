# ChatPye Infrastructure (OpenTofu / Terraform)

**Primary region:** `eu-west-2` (AWS London)  
**IaC tool:** OpenTofu or Terraform >= 1.6

## Operator approval required

> **Do not run `tofu apply` or `terraform apply` without explicit operator approval.**  
> This repository contains infrastructure **definitions only**. Provisioning creates billable AWS resources.

## Structure

```
infra/
  modules/           # Reusable modules (VPC, ECS, RDS, …)
  environments/
    staging/         # Isolated staging stack
    production/      # Isolated production stack (ALB public)
```

## Validation (safe — no resources created)

```bash
npm run infra:validate:staging
npm run infra:validate:production
```

## Apply (operator only)

```bash
cd infra/environments/staging
tofu init
tofu plan -out=plan.tfplan
# Review plan with team → explicit approval → tofu apply plan.tfplan
```

## Cost tags (all modules)

| Tag | Example |
|-----|---------|
| Application | ChatPye |
| Environment | staging / production |
| Owner | platform-team |
| CostCentre | engineering |
| DataClassification | confidential |
| ManagedBy | Terraform |

## CI/CD

GitHub → **CodeConnections** → **CodePipeline** → **CodeBuild** → ECR → ECS deploy.  
Workload IAM roles only — **no static AWS access keys** in CI or application code.

See `docs/runbooks/DEPLOYMENT.md`.
