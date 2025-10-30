# PowerShell script to generate SSL certificates for 192.168.10.95
# This uses Windows built-in certificate generation

$ipAddress = "192.168.10.95"
$certsDir = ".\certs"
$keyFile = "$certsDir\$ipAddress-key.pem"
$certFile = "$certsDir\$ipAddress.pem"

Write-Host "🔐 Generating SSL certificates for $ipAddress..." -ForegroundColor Green

# Ensure certs directory exists
if (!(Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force
    Write-Host "✅ Created certs directory" -ForegroundColor Green
}

# Check if certificates already exist
if ((Test-Path $keyFile) -and (Test-Path $certFile)) {
    Write-Host "⚠️  Certificates already exist. Skipping generation." -ForegroundColor Yellow
    Write-Host "   Key file: $keyFile" -ForegroundColor Cyan
    Write-Host "   Cert file: $certFile" -ForegroundColor Cyan
    exit 0
}

try {
    # Create a self-signed certificate using PowerShell
    Write-Host "🔑 Generating certificate using PowerShell..." -ForegroundColor Green
    
    # Create certificate with IP address as subject
    $cert = New-SelfSignedCertificate -DnsName $ipAddress -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddDays(365)
    
    # Export the certificate to PEM format
    $certPath = "Cert:\CurrentUser\My\$($cert.Thumbprint)"
    
    # Export private key
    $cert | Export-PfxCertificate -FilePath "$certsDir\temp.pfx" -Password (ConvertTo-SecureString -String "temp" -Force -AsPlainText)
    
    # Convert PFX to PEM using OpenSSL if available, otherwise use alternative method
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
        Write-Host "📜 Converting to PEM format using OpenSSL..." -ForegroundColor Green
        openssl pkcs12 -in "$certsDir\temp.pfx" -out $certFile -clcerts -nokeys -passin pass:temp
        openssl pkcs12 -in "$certsDir\temp.pfx" -out $keyFile -nocerts -nodes -passin pass:temp
    } else {
        Write-Host "📜 Converting to PEM format using PowerShell..." -ForegroundColor Green
        
        # Export certificate in Base64 format
        $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
        $certBase64 = [System.Convert]::ToBase64String($certBytes)
        
        # Create PEM certificate file
        $pemCert = "-----BEGIN CERTIFICATE-----`n"
        for ($i = 0; $i -lt $certBase64.Length; $i += 64) {
            $pemCert += $certBase64.Substring($i, [Math]::Min(64, $certBase64.Length - $i)) + "`n"
        }
        $pemCert += "-----END CERTIFICATE-----"
        
        Set-Content -Path $certFile -Value $pemCert -Encoding UTF8
        
        # For the private key, we'll need to use a different approach
        # Export the private key separately
        $privateKey = $cert.PrivateKey
        if ($privateKey) {
            $rsa = $privateKey.ExportParameters($true)
            $keyBase64 = [System.Convert]::ToBase64String($rsa.Modulus)
            
            $pemKey = "-----BEGIN RSA PRIVATE KEY-----`n"
            for ($i = 0; $i -lt $keyBase64.Length; $i += 64) {
                $pemKey += $keyBase64.Substring($i, [Math]::Min(64, $keyBase64.Length - $i)) + "`n"
            }
            $pemKey += "-----END RSA PRIVATE KEY-----"
            
            Set-Content -Path $keyFile -Value $pemKey -Encoding UTF8
        }
    }
    
    # Clean up temporary files
    Remove-Item "$certsDir\temp.pfx" -ErrorAction SilentlyContinue
    Remove-Item $certPath -ErrorAction SilentlyContinue
    
    Write-Host "`n🎉 SSL certificates generated successfully!" -ForegroundColor Green
    Write-Host "   Private Key: $keyFile" -ForegroundColor Cyan
    Write-Host "   Certificate: $certFile" -ForegroundColor Cyan
    Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Update server.js to use the new certificate files" -ForegroundColor White
    Write-Host "   2. Restart the HTTPS server" -ForegroundColor White
    Write-Host "   3. Test at: https://$ipAddress:3000" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error generating certificates: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n🔧 Alternative: Use mkcert tool" -ForegroundColor Yellow
    Write-Host "   1. Install mkcert: https://github.com/FiloSottile/mkcert" -ForegroundColor White
    Write-Host "   2. Run: mkcert -install" -ForegroundColor White
    Write-Host "   3. Run: mkcert $ipAddress" -ForegroundColor White
    exit 1
}
