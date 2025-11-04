param(
  [Parameter(Mandatory=$true)] [string]$PublicUrl
)

$ErrorActionPreference = "Stop"

Write-Host "Ensuring dependencies are installed..." -ForegroundColor Cyan
npm install --no-audit --prefer-offline

Write-Host "Building Next.js app..." -ForegroundColor Cyan
npm run build

Write-Host "Starting Next.js with NEXTAUTH_URL=$PublicUrl on 127.0.0.1:3000" -ForegroundColor Green
$env:NEXTAUTH_URL = $PublicUrl
npm run start -- -H 127.0.0.1 -p 3000


