# Creating SSL Certificates for 192.168.10.95

## Method 1: Using Windows Certificate Manager (Recommended)

### Step 1: Open Certificate Manager
1. Press `Win + R`, type `mmc`, and press Enter
2. Go to `File > Add/Remove Snap-in`
3. Select `Certificates` and click `Add`
4. Choose `Computer account` and click `Next`
5. Select `Local computer` and click `Finish`
6. Click `OK`

### Step 2: Create Self-Signed Certificate
1. Expand `Certificates (Local Computer) > Personal`
2. Right-click on `Certificates` and select `All Tasks > Request New Certificate`
3. Click `Next` twice
4. Select `Web Server` template and click `Enroll`
5. Click `Finish`

### Step 3: Configure Certificate for IP Address
1. Right-click the new certificate and select `Properties`
2. Go to `Details` tab
3. Click `Edit Properties`
4. In `Subject Alternative Name`, add:
   - Type: `IP Address`
   - Value: `192.168.10.95`
5. Click `OK` and `OK` again

### Step 4: Export Certificate
1. Right-click the certificate and select `All Tasks > Export`
2. Choose `Yes, export the private key`
3. Select `Personal Information Exchange - PKCS #12 (.PFX)`
4. Check `Include all certificates in the certification path`
5. Set a password and save as `192.168.10.95.pfx`

### Step 5: Convert to PEM Format
Use OpenSSL or online converter to convert PFX to PEM:
```bash
# If you have OpenSSL:
openssl pkcs12 -in 192.168.10.95.pfx -out 192.168.10.95.pem -clcerts -nokeys
openssl pkcs12 -in 192.168.10.95.pfx -out 192.168.10.95-key.pem -nocerts -nodes
```

## Method 2: Using mkcert (Easiest)

### Install mkcert
1. Download from: https://github.com/FiloSottile/mkcert/releases
2. Extract `mkcert-v1.4.4-windows-amd64.exe` to a folder
3. Rename to `mkcert.exe`
4. Add the folder to your PATH

### Generate Certificates
```bash
# Install the local CA
mkcert -install

# Generate certificate for your IP
mkcert 192.168.10.95

# This creates:
# 192.168.10.95.pem (certificate)
# 192.168.10.95-key.pem (private key)
```

## Method 3: Using IIS Manager

### Step 1: Open IIS Manager
1. Press `Win + R`, type `inetmgr`, and press Enter

### Step 2: Create Self-Signed Certificate
1. Click on your server name in the left panel
2. Double-click `Server Certificates`
3. Click `Create Self-Signed Certificate` in the right panel
4. Enter:
   - Name: `192.168.10.95`
   - Store: `Personal`
5. Click `OK`

### Step 3: Export Certificate
1. Right-click the certificate and select `Export`
2. Choose location and set password
3. Save as `192.168.10.95.pfx`

## Method 4: Quick PowerShell Solution

Run this PowerShell command as Administrator:

```powershell
# Create certificate
$cert = New-SelfSignedCertificate -DnsName "192.168.10.95" -CertStoreLocation "Cert:\LocalMachine\My"

# Export to PFX
$pwd = ConvertTo-SecureString -String "password123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath ".\certs\192.168.10.95.pfx" -Password $pwd

# Convert to PEM (requires OpenSSL)
# openssl pkcs12 -in .\certs\192.168.10.95.pfx -out .\certs\192.168.10.95.pem -clcerts -nokeys -passin pass:password123
# openssl pkcs12 -in .\certs\192.168.10.95.pfx -out .\certs\192.168.10.95-key.pem -nocerts -nodes -passin pass:password123
```

## After Creating Certificates

1. Place the files in your `certs/` directory:
   - `192.168.10.95.pem` (certificate)
   - `192.168.10.95-key.pem` (private key)

2. Update `server.js` to use the new certificates:
   ```javascript
   const httpsOptions = {
     key: fs.readFileSync('./certs/192.168.10.95-key.pem'),
     cert: fs.readFileSync('./certs/192.168.10.95.pem')
   }
   ```

3. Restart your HTTPS server:
   ```bash
   npm run dev:https
   ```

## Recommended Approach

**Use mkcert** - it's the easiest and most reliable method for development certificates.
