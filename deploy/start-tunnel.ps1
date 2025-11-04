param(
  [string]$CloudflaredPath = "$PSScriptRoot\\cloudflared.exe",
  [string]$TargetUrl = "http://127.0.0.1:3000"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $CloudflaredPath)) {
  Write-Host "Downloading cloudflared..." -ForegroundColor Yellow
  $zip = Join-Path $env:TEMP "cloudflared-stable-windows-amd64.zip"
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.zip" -OutFile $zip
  Expand-Archive -LiteralPath $zip -DestinationPath $PSScriptRoot -Force
  if (!(Test-Path $CloudflaredPath)) {
    throw "Failed to download cloudflared."
  }
}

Write-Host "Starting Cloudflare Tunnel to $TargetUrl ..." -ForegroundColor Green
& $CloudflaredPath tunnel --url $TargetUrl


