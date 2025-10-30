# Create and export a self-signed certificate for 192.168.10.70
param(
  [string]$Ip = "192.168.10.70",
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $OutDir -or $OutDir -eq "") {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $repoRoot = Split-Path -Parent $scriptDir
  $OutDir = Join-Path $repoRoot "certs"
}

if (!(Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

Write-Host "Creating self-signed cert for $Ip in CurrentUser store..." -ForegroundColor Cyan
$cert = New-SelfSignedCertificate -DnsName $Ip -CertStoreLocation Cert:\CurrentUser\My -KeyExportPolicy Exportable -FriendlyName "Local HTTPS $Ip" -NotAfter (Get-Date).AddYears(1)

$pwd = ConvertTo-SecureString "temp123" -AsPlainText -Force
$pfxPath = Join-Path $OutDir "$Ip.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd | Out-Null

Write-Host "Exported PFX:" $pfxPath -ForegroundColor Green
Write-Host "Password: temp123" -ForegroundColor Yellow
