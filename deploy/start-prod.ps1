$ErrorActionPreference = "Stop"

Write-Host "Ensuring dependencies are installed..." -ForegroundColor Cyan
npm install --no-audit --prefer-offline

Write-Host "Building Next.js app..." -ForegroundColor Cyan
npm run build

Write-Host "Starting Next.js on 127.0.0.1:3000 (production)..." -ForegroundColor Green
npm run start -- -H 127.0.0.1 -p 3000



