#Requires -Version 5.1
<#
.SYNOPSIS
  Provision ChatPye AWS resources: S3 bucket + Aurora PostgreSQL Serverless v2.

.PARAMETER Region
  AWS region (default: us-east-1)

.PARAMETER ProjectName
  Resource name prefix (default: chatpye)

.PARAMETER DbPassword
  Master password for Aurora (min 8 chars). Prompted if omitted.

.EXAMPLE
  .\scripts\deploy\setup-aws.ps1 -Region us-east-1 -ProjectName chatpye-staging
#>
param(
  [string]$Region = "us-east-1",
  [string]$ProjectName = "chatpye",
  [string]$DbPassword = "",
  [string]$VpcId = ""
)

$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Error "Missing '$name'. Install AWS CLI: https://aws.amazon.com/cli/"
  }
}

Require-Command aws

if (-not $DbPassword) {
  $secure = Read-Host "Aurora master password (min 8 chars)" -AsSecureString
  $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

$AccountId = aws sts get-caller-identity --query Account --output text
Write-Host "AWS Account: $AccountId  Region: $Region"

# --- S3 bucket for video uploads ---
$BucketName = "$ProjectName-uploads-$AccountId"
Write-Host "Creating S3 bucket: $BucketName"
try {
  if ($Region -eq "us-east-1") {
    aws s3api create-bucket --bucket $BucketName --region $Region | Out-Null
  } else {
    aws s3api create-bucket --bucket $BucketName --region $Region `
      --create-bucket-configuration LocationConstraint=$Region | Out-Null
  }
} catch {
  Write-Host "Bucket may already exist, continuing..."
}

aws s3api put-bucket-versioning --bucket $BucketName `
  --versioning-configuration Status=Enabled | Out-Null

aws s3api put-public-access-block --bucket $BucketName `
  --public-access-block-configuration `
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true | Out-Null

Write-Host "S3 bucket ready: $BucketName"

# --- VPC / subnets for Aurora ---
if (-not $VpcId) {
  $VpcId = aws ec2 describe-vpcs --filters Name=isDefault,Values=true `
    --query "Vpcs[0].VpcId" --output text --region $Region
}
Write-Host "Using VPC: $VpcId"

$SubnetIds = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" `
  --query "Subnets[*].SubnetId" --output text --region $Region
$SubnetArray = $SubnetIds -split "\s+"
if ($SubnetArray.Count -lt 2) {
  Write-Error "Need at least 2 subnets in VPC $VpcId"
}

$DbSubnetGroup = "$ProjectName-db-subnets"
try {
  aws rds create-db-subnet-group `
    --db-subnet-group-name $DbSubnetGroup `
    --db-subnet-group-description "ChatPye Aurora subnets" `
    --subnet-ids $SubnetArray[0] $SubnetArray[1] `
    --region $Region | Out-Null
} catch {
  Write-Host "DB subnet group may already exist"
}

# Security group: allow PostgreSQL from anywhere (tighten in production!)
$SgName = "$ProjectName-aurora-sg"
$SgId = aws ec2 create-security-group `
  --group-name $SgName `
  --description "ChatPye Aurora PostgreSQL" `
  --vpc-id $VpcId `
  --query GroupId --output text --region $Region 2>$null

if (-not $SgId) {
  $SgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$SgName" `
    --query "SecurityGroups[0].GroupId" --output text --region $Region
}

aws ec2 authorize-security-group-ingress `
  --group-id $SgId --protocol tcp --port 5432 --cidr 0.0.0.0/0 `
  --region $Region 2>$null

$ClusterId = "$ProjectName-aurora"
$DbName = "chatpye"
$MasterUser = "chatpye_admin"

Write-Host "Creating Aurora PostgreSQL cluster (Serverless v2)... this takes 10-15 minutes"

aws rds create-db-cluster `
  --db-cluster-identifier $ClusterId `
  --engine aurora-postgresql `
  --engine-version "17.5" `
  --master-username $MasterUser `
  --master-user-password $DbPassword `
  --database-name $DbName `
  --db-subnet-group-name $DbSubnetGroup `
  --vpc-security-group-ids $SgId `
  --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=2 `
  --region $Region

aws rds create-db-instance `
  --db-instance-identifier "$ClusterId-instance-1" `
  --db-cluster-identifier $ClusterId `
  --db-instance-class db.serverless `
  --engine aurora-postgresql `
  --publicly-accessible `
  --region $Region

Write-Host "Waiting for Aurora instance to become available..."
aws rds wait db-instance-available `
  --db-instance-identifier "$ClusterId-instance-1" `
  --region $Region

$Endpoint = aws rds describe-db-clusters `
  --db-cluster-identifier $ClusterId `
  --query "DBClusters[0].Endpoint" --output text --region $Region

$DatabaseUrl = "postgresql://${MasterUser}:$([uri]::EscapeDataString($DbPassword))@${Endpoint}:5432/${DbName}?sslmode=require"

Write-Host ""
Write-Host "========== ChatPye AWS setup complete =========="
Write-Host "S3_BUCKET=$BucketName"
Write-Host "AWS_REGION=$Region"
Write-Host "AURORA_ENDPOINT=$Endpoint"
Write-Host ""
Write-Host "DATABASE_URL (add to Vercel + GitHub secrets):"
Write-Host $DatabaseUrl
Write-Host ""
Write-Host "Next: run  .\scripts\deploy\push-schema.ps1  with DATABASE_URL set"
Write-Host "================================================="

# Save local reference (gitignored)
@{
  created = (Get-Date -Format "yyyy-MM-dd")
  region = $Region
  bucket = $BucketName
  cluster = $ClusterId
  endpoint = $Endpoint
  databaseUrl = $DatabaseUrl
} | ConvertTo-Json | Set-Content -Path ".aws-deploy-output.json"

Write-Host "Saved .aws-deploy-output.json (do not commit)"
