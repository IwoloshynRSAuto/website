# Stop all Node processes that might be using Prisma
Write-Host "Stopping Node processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Regenerate Prisma Client
Write-Host "Regenerating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "Prisma Client regenerated successfully!" -ForegroundColor Green
    Write-Host "You can now restart your dev server with: npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "Failed to regenerate Prisma Client. Please try manually:" -ForegroundColor Red
    Write-Host "  1. Stop your dev server (Ctrl+C)" -ForegroundColor Yellow
    Write-Host "  2. Run: npx prisma generate" -ForegroundColor Yellow
    Write-Host "  3. Restart your dev server: npm run dev" -ForegroundColor Yellow
}
