# PowerShell script to restart the Next.js development server

Write-Host "🛑 Stopping any running Next.js servers..." -ForegroundColor Yellow

# Kill any node processes running on port 3000 or 3001
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue | ForEach-Object {
    $pid = (Get-NetTCPConnection -LocalPort $_.LocalPort -ErrorAction SilentlyContinue).OwningProcess
    if ($pid) {
        Write-Host "Stopping process on port $($_.LocalPort) (PID: $pid)" -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

# Also kill any node processes that might be running the server
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
foreach ($proc in $nodeProcesses) {
    if ($proc.Path -like "*Website*" -or $proc.CommandLine -like "*next dev*" -or $proc.CommandLine -like "*server.js*") {
        Write-Host "Stopping Node process (PID: $($proc.Id))" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 2

Write-Host "✅ Server stopped" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting server..." -ForegroundColor Cyan
Write-Host ""

# Start the HTTPS server
& npm run dev:https

