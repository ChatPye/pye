#Requires -Version 5.1
<#
.SYNOPSIS
  Push Drizzle schema to Aurora PostgreSQL.

.EXAMPLE
  $env:DATABASE_URL = "postgresql://..."
  .\scripts\deploy\push-schema.ps1
#>
param(
  [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  if (Test-Path ".aws-deploy-output.json") {
    $out = Get-Content ".aws-deploy-output.json" | ConvertFrom-Json
    $DatabaseUrl = $out.databaseUrl
    Write-Host "Using DATABASE_URL from .aws-deploy-output.json"
  }
}

if (-not $DatabaseUrl) {
  Write-Error "Set DATABASE_URL or run setup-aws.ps1 first"
}

$env:DATABASE_URL = $DatabaseUrl
npm run db:push
Write-Host "Schema pushed successfully."
