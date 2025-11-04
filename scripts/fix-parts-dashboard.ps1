# Script to fix Parts Dashboard by regenerating Prisma client
# Make sure to stop the dev server first!

Write-Host "=== Parts Dashboard Fix Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if Node processes are running
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"} -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "WARNING: Found $($nodeProcesses.Count) Node process(es) running." -ForegroundColor Yellow
    Write-Host "These may be locking Prisma files. Recommended to stop them first." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Node processes:" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "  - PID $($_.Id) - Started: $($_.StartTime)" -ForegroundColor Gray
    }
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Aborted. Please stop the dev server and run this script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Regenerating Prisma Client..." -ForegroundColor Green
Write-Host ""

# Regenerate Prisma client
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Prisma client has been regenerated." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Start your development server again" -ForegroundColor White
    Write-Host "2. Navigate to the Parts Dashboard" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to regenerate Prisma client." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Make sure ALL Node.js processes are stopped" -ForegroundColor White
    Write-Host "2. Check Task Manager for any 'node.exe' processes" -ForegroundColor White
    Write-Host "3. Close any terminals/editors that might be using Prisma files" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
    Write-Host ""
}

