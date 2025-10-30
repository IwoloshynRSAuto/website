# Azure AD App Registration Setup for HTTPS Internal Domain

## Current Configuration
- **App Registration ID**: 3781380c-6541-4bef-a666-81d1949c4146
- **Tenant ID**: db7f9555-af42-4e86-938b-707838df8551
- **Internal Domain**: https://192.168.10.95:3000

## Required Azure AD App Registration Updates

### 1. Update Redirect URIs
Navigate to your Azure AD App Registration and add the following redirect URIs:

**Authentication > Redirect URIs:**
- `https://192.168.10.95:3000/api/auth/callback/azure-ad`
- `https://192.168.10.95:3000` (for post-login redirect)

**Keep existing localhost URIs for development:**
- `http://localhost:3000/api/auth/callback/azure-ad`
- `http://localhost:3000`

### 2. Update Logout URLs (Optional)
**Authentication > Logout URLs:**
- `https://192.168.10.95:3000/auth/signin`

### 3. Update Front-channel Logout URL (Optional)
**Authentication > Front-channel logout URL:**
- `https://192.168.10.95:3000/api/auth/signout`

### 4. API Permissions
Ensure the following Microsoft Graph permissions are granted:
- `User.Read` (Delegated)
- `User.ReadBasic.All` (Delegated)
- `openid` (Delegated)
- `profile` (Delegated)
- `email` (Delegated)

### 5. Token Configuration
**Token configuration > Access tokens:**
- Ensure "Access tokens" is enabled
- Token version: 2.0

**Token configuration > ID tokens:**
- Ensure "ID tokens" is enabled

## Certificate Requirements

### SSL Certificate for 192.168.10.95
You need to create or obtain an SSL certificate for your internal IP address:

1. **Self-signed certificate** (for internal use):
   ```bash
   # Generate private key
   openssl genrsa -out 192.168.10.95-key.pem 2048
   
   # Generate certificate
   openssl req -new -x509 -key 192.168.10.95-key.pem -out 192.168.10.95.pem -days 365 -subj "/CN=192.168.10.95"
   ```

2. **Place certificates in the `certs/` directory:**
   - `certs/192.168.10.95-key.pem`
   - `certs/192.168.10.95.pem`

## Testing the Configuration

### 1. Start the HTTPS server:
```bash
npm run dev:https
```

### 2. Test authentication flow:
1. Navigate to `https://192.168.10.95:3000`
2. Click sign in
3. Verify redirect to Microsoft login
4. After authentication, verify redirect back to `https://192.168.10.95:3000`

### 3. Verify HTTPS enforcement:
- Try accessing `http://192.168.10.95:3000` - should redirect to HTTPS
- Check browser security indicators for valid certificate

## Troubleshooting

### Common Issues:
1. **Certificate errors**: Ensure certificates are in the correct location and format
2. **Redirect URI mismatch**: Double-check Azure AD redirect URIs match exactly
3. **CORS issues**: Ensure internal domain is properly configured
4. **HTTPS enforcement**: Check Next.js configuration for proper redirects

### Debug Steps:
1. Check browser developer tools for network errors
2. Verify environment variables are loaded correctly
3. Test with `curl` to verify HTTPS responses
4. Check Azure AD sign-in logs for authentication errors
