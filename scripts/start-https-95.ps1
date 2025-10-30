# Start Next.js over HTTPS bound to 192.168.10.95 using existing PFX
param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

# Configure environment for 192.168.10.95 using existing PFX in certs folder
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$certPath = Join-Path $repoRoot "certs\192.168.10.95.pfx"

$env:NEXTAUTH_URL = "https://192.168.10.95:$Port"
$env:SSL_PFX_PATH = $certPath
$env:SSL_PFX_PASS = "temp123"
$env:PORT = "$Port"

Write-Host "Starting HTTPS server at $env:NEXTAUTH_URL using $env:SSL_PFX_PATH" -ForegroundColor Green
npm run dev:https
