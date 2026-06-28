#Requires -Version 5.1
<#
.SYNOPSIS
  Create a fresh git history dated 2026-06-28 and prepare for a new GitHub repo.

.PARAMETER RemoteUrl
  Optional new GitHub repo URL, e.g. https://github.com/YourOrg/chatpye.git

.EXAMPLE
  .\scripts\deploy\fresh-git.ps1 -RemoteUrl "https://github.com/YourOrg/chatpye.git"
#>
param(
  [string]$RemoteUrl = ""
)

$ErrorActionPreference = "Stop"
$CommitDate = "2026-06-28T12:00:00"

Write-Host "Creating fresh git history (dated $CommitDate)..."

if (Test-Path .git) {
  Remove-Item -Recurse -Force .git
}

git init -b main
git add -A

$env:GIT_AUTHOR_DATE = $CommitDate
$env:GIT_COMMITTER_DATE = $CommitDate

git commit -m @"
ChatPye Web — initial release (2026-06-28)

Next.js on Vercel, Aurora PostgreSQL, S3, Bedrock.
Video QA, HR dashboard, course assignment, competency profiles.
"@

Remove-Item Env:GIT_AUTHOR_DATE -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_DATE -ErrorAction SilentlyContinue

if ($RemoteUrl) {
  git remote add origin $RemoteUrl
  Write-Host "Remote added: $RemoteUrl"
  Write-Host "Push with: git push -u origin main"
} else {
  Write-Host "No remote URL provided. Create repo on GitHub, then:"
  Write-Host "  git remote add origin https://github.com/YOUR_ORG/chatpye.git"
  Write-Host "  git push -u origin main"
}

Write-Host "Done. Fresh history with single commit dated 2026-06-28."
