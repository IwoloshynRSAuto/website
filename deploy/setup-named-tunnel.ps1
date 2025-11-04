param(
  [Parameter(Mandatory=$true)] [string]$Hostname,  # e.g., app.rsautomation.net
  [string]$TunnelName = "my-portal",
  [string]$ConfigPath = "$PSScriptRoot\\cloudflared-config.yml"
)

$ErrorActionPreference = "Stop"

$cloudflared = Join-Path $PSScriptRoot "cloudflared.exe"
if (!(Test-Path $cloudflared)) {
  Write-Host "Downloading cloudflared..." -ForegroundColor Yellow
  # Prefer direct EXE download; fallback to ZIP if needed
  $exeUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $exeUrl -OutFile $cloudflared
  } catch {
    Write-Host "Direct EXE download failed, trying ZIP..." -ForegroundColor Yellow
    $zip = Join-Path $env:TEMP "cloudflared-windows-amd64.zip"
    Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.zip" -OutFile $zip
    Expand-Archive -LiteralPath $zip -DestinationPath $PSScriptRoot -Force
    if (!(Test-Path $cloudflared)) { throw "Failed to retrieve cloudflared.exe" }
  }
}

# Login (one-time; opens browser)
Write-Host "If prompted, complete Cloudflare login in your browser..." -ForegroundColor Cyan
& $cloudflared tunnel login

# Create tunnel if it does not exist
Write-Host "Creating (or reusing) tunnel '$TunnelName'..." -ForegroundColor Cyan
& $cloudflared tunnel create $TunnelName | Out-String | Tee-Object -Variable tunnelOut | Out-Null

# Extract Tunnel ID by reading the created credentials file name in %USERPROFILE%\.cloudflared
$cloudDir = Join-Path $env:USERPROFILE ".cloudflared"
if (!(Test-Path $cloudDir)) { throw "Cloudflared credentials directory not found: $cloudDir" }
$credFile = Get-ChildItem $cloudDir -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $credFile) { throw "Could not locate tunnel credentials JSON in $cloudDir" }
$tunnelId = [System.IO.Path]::GetFileNameWithoutExtension($credFile.Name)

Write-Host "Using Tunnel ID: $tunnelId" -ForegroundColor Green

# Write config
$config = @"
tunnel: $TunnelName
credentials-file: $($credFile.FullName)

ingress:
  - hostname: $Hostname
    service: http://127.0.0.1:3000
  - service: http_status:404
"@
Set-Content -LiteralPath $ConfigPath -Value $config -Encoding UTF8
Write-Host "Wrote config: $ConfigPath" -ForegroundColor Green

# Route DNS
Write-Host "Creating DNS route for $Hostname..." -ForegroundColor Cyan
& $cloudflared tunnel route dns $TunnelName $Hostname

Write-Host "Starting tunnel. Keep this window open to keep the tunnel alive." -ForegroundColor Green
& $cloudflared tunnel --config $ConfigPath run


