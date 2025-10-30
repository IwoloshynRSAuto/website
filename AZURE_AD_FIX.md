# Azure AD Configuration Fix

## Issues Identified

1. ✅ **Environment Variables Fixed** - Created `.env.local` with proper values
2. 🔧 **Azure AD Redirect URIs** - Need to update app registration

## Current Status

The server is now running with proper environment variables:
- `NEXTAUTH_URL="https://192.168.10.95:3000"`
- `NEXTAUTH_SECRET` is set
- `MICROSOFT_CLIENT_ID` is set
- `MICROSOFT_CLIENT_SECRET` is set
- `MICROSOFT_TENANT_ID` is set

## Required Azure AD App Registration Updates

### Step 1: Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory**
3. Go to **App registrations**
4. Find your app: `3781380c-6541-4bef-a666-81d1949c4146`

### Step 2: Update Redirect URIs
1. Click on your app registration
2. Go to **Authentication** in the left menu
3. In **Redirect URIs**, add these URIs:
   - `https://192.168.10.95:3000/api/auth/callback/azure-ad`
   - `https://192.168.10.95:3000`

4. **Keep existing localhost URIs for development:**
   - `http://localhost:3000/api/auth/callback/azure-ad`
   - `http://localhost:3000`

### Step 3: Update Logout URLs (Optional)
In **Authentication > Logout URLs**, add:
- `https://192.168.10.95:3000/auth/signin`

### Step 4: Save Changes
Click **Save** at the top of the page.

## Testing the Fix

After updating Azure AD:

1. **Navigate to your site**: `https://192.168.10.95:3000`
2. **Click "Sign in with Microsoft 365"**
3. **Expected behavior**:
   - Should redirect to Microsoft login
   - After authentication, should redirect back to `https://192.168.10.95:3000`
   - Should NOT redirect to localhost

## Troubleshooting

### If still redirecting to localhost:
1. Clear browser cache and cookies
2. Check that Azure AD redirect URIs are saved correctly
3. Verify the `NEXTAUTH_URL` in `.env.local` is correct
4. Restart the server after making changes

### If getting certificate errors:
1. Click "Advanced" in the browser
2. Click "Proceed to 192.168.10.95 (unsafe)"
3. This is normal for self-signed certificates

### If authentication fails:
1. Check the server logs for specific error messages
2. Verify all environment variables are loaded correctly
3. Ensure the Azure AD app has the correct permissions

## Current Server Status

✅ Server is running on `https://192.168.10.95:3000`
✅ Environment variables are properly configured
✅ HTTPS is working (with certificate warning)
🔧 Azure AD redirect URIs need to be updated

## Next Steps

1. Update Azure AD app registration with new redirect URIs
2. Test the authentication flow
3. If successful, the application will redirect to your internal domain instead of localhost
