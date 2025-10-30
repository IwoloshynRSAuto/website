# Start Next.js over HTTPS bound to 192.168.10.70 using PFX
param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$certPath = Join-Path $repoRoot "certs\192.168.10.70.pfx"

$env:NEXTAUTH_URL = "https://192.168.10.70:$Port"
$env:SSL_PFX_PATH = $certPath
$env:SSL_PFX_PASS = "temp123"
$env:PORT = "$Port"

Write-Host "Starting HTTPS server at $env:NEXTAUTH_URL using $env:SSL_PFX_PATH" -ForegroundColor Green
npm run dev:https
