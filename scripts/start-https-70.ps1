# Start Next.js over HTTPS bound to 192.168.10.70 using PFX
param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$certPath = Join-Path $repoRoot "certs\192.168.10.70.pfx"

$env:NEXTAUTH_URL = "https://192.168.10.70:$Port"
$env:SSL_PFX_PATH = "C:\Users\iwoloshyn\Documents\Website\certs\loopback.pfx"
$env:SSL_PFX_PASS = "Rs8675309Auto"
$env:PORT = "$Port"

# Ensure local SQLite DB path and a stable secret for auth
if (-not $env:DATABASE_URL) { $env:DATABASE_URL = "file:./prisma/dev.db" }
if (-not $env:NEXTAUTH_SECRET) { $env:NEXTAUTH_SECRET = "local-dev-secret-change-me" }

Write-Host "Starting HTTPS server at $env:NEXTAUTH_URL using $env:SSL_PFX_PATH" -ForegroundColor Green
npm run dev:https
