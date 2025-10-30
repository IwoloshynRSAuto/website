# Export certificate to PFX format
$cert = Get-ChildItem -Path 'Cert:\CurrentUser\My' | Where-Object {$_.Subject -eq 'CN=192.168.10.95'}
$pwd = ConvertTo-SecureString -String 'temp123' -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath '.\certs\192.168.10.95.pfx' -Password $pwd
Write-Host "Certificate exported to .\certs\192.168.10.95.pfx"
