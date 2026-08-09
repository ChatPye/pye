# AWS platform bootstrap (run once per account/region)

Create these resources **before** `tofu init` in `infra/environments/staging` or
`production`. They are intentionally **not** managed by the application stacks.

## Region

`eu-west-2` (London)

## Resources

| Resource | Staging name | Production name |
|----------|--------------|-----------------|
| S3 state bucket | `chatpye-terraform-state-staging` | `chatpye-terraform-state-production` |
| DynamoDB lock table | `chatpye-terraform-locks` (shared) | same |

```powershell
aws s3 mb s3://chatpye-terraform-state-staging --region eu-west-2
aws s3 mb s3://chatpye-terraform-state-production --region eu-west-2
aws s3api put-bucket-versioning --bucket chatpye-terraform-state-staging `
  --versioning-configuration Status=Enabled
aws s3api put-bucket-versioning --bucket chatpye-terraform-state-production `
  --versioning-configuration Status=Enabled

aws dynamodb create-table `
  --table-name chatpye-terraform-locks `
  --attribute-definitions AttributeName=LockID,AttributeType=S `
  --key-schema AttributeName=LockID,KeyType=HASH `
  --billing-mode PAY_PER_REQUEST `
  --region eu-west-2
```

## KMS

The staging/production stacks create their own KMS keys via `infra/modules/kms`.

## Budgets

Create AWS Budgets manually in the console after operator approval. Do not
auto-provision billable alarms via Terraform without sign-off.

## CodeConnections

Create a GitHub connection in AWS Console and pass the ARN to
`codestar_connection_arn` in `terraform.tfvars`. Approve the GitHub App in the
AWS UI before running the pipeline.
