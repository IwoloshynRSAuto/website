param(
  [Parameter(Mandatory=$true)] [string]$Domain,
  [string]$CaddyDir = "C:\caddy",
  [string]$CaddyExe = "C:\caddy\caddy.exe",
  [string]$SourceCaddyfile = "deploy\Caddyfile"
)

$ErrorActionPreference = "Stop"

Write-Host "Setting up Caddy reverse proxy for domain: $Domain" -ForegroundColor Cyan

if (!(Test-Path $CaddyDir)) {
  Write-Host "Creating Caddy directory at $CaddyDir" -ForegroundColor Yellow
  New-Item -ItemType Directory -Path $CaddyDir | Out-Null
}

if (!(Test-Path $CaddyExe)) {
  Write-Host "Caddy not found. Downloading latest caddy_windows_amd64.zip..." -ForegroundColor Yellow
  $zipPath = Join-Path $env:TEMP "caddy_windows_amd64.zip"
  Invoke-WebRequest -UseBasicParsing -Uri "https://caddyserver.com/api/download?os=windows&arch=amd64" -OutFile $zipPath
  Write-Host "Extracting Caddy..." -ForegroundColor Yellow
  Expand-Archive -LiteralPath $zipPath -DestinationPath $CaddyDir -Force
}

if (!(Test-Path $SourceCaddyfile)) {
  throw "Source Caddyfile not found at $SourceCaddyfile"
}

$destCaddyfile = Join-Path $CaddyDir "Caddyfile"
$content = Get-Content -LiteralPath $SourceCaddyfile -Raw
$content = $content -replace "time.yourdomain.com", $Domain
Set-Content -LiteralPath $destCaddyfile -Value $content -Encoding UTF8
Write-Host "Wrote Caddyfile to $destCaddyfile" -ForegroundColor Green

Write-Host "Opening Windows Firewall ports 80 and 443 (if not already open)" -ForegroundColor Yellow
try { New-NetFirewallRule -DisplayName "HTTP 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -ErrorAction Stop } catch {}
try { New-NetFirewallRule -DisplayName "HTTPS 443" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction Stop } catch {}

Write-Host "Starting Caddy (foreground). Press Ctrl+C to stop. Use 'caddy.exe install' to run as a service later." -ForegroundColor Cyan
& $CaddyExe run --config $destCaddyfile


