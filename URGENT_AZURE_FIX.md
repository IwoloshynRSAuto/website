# 🚨 URGENT: Azure AD Redirect Fix Required

## The Problem
You're being redirected to `localhost:3000` instead of `https://192.168.10.95:3000` because your Azure AD app registration is configured with localhost redirect URIs.

## ⚡ IMMEDIATE ACTION REQUIRED

### Step 1: Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory**
3. Go to **App registrations**
4. Find your app: `3781380c-6541-4bef-a666-81d1949c4146`

### Step 2: Update Redirect URIs (CRITICAL)
1. Click on your app registration
2. Go to **Authentication** in the left menu
3. In **Redirect URIs**, you need to ADD these URIs:
   ```
   https://192.168.10.95:3000/api/auth/callback/azure-ad
   https://192.168.10.95:3000
   ```

4. **DO NOT REMOVE** the existing localhost URIs:
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   http://localhost:3000
   ```

### Step 3: Save Changes
- Click **Save** at the top of the page
- Wait for the "Successfully updated" message

## 🔍 Why This Happens

The Azure AD app registration determines where users are redirected after authentication. Currently, it's configured to redirect to localhost, which is why you see:
- `localhost:3000/api/auth/error?error=OAuthSignin`
- `ERR_EMPTY_RESPONSE` error

## ✅ After Making Changes

1. **Clear your browser cache and cookies**
2. **Navigate to**: `https://192.168.10.95:3000`
3. **Click "Sign in with Microsoft 365"**
4. **Expected behavior**:
   - Should redirect to Microsoft login
   - After authentication, should redirect back to `https://192.168.10.95:3000`
   - Should NOT redirect to localhost

## 🚨 If You Still Get Redirected to Localhost

1. **Double-check** the redirect URIs are saved correctly in Azure AD
2. **Clear browser cache** completely
3. **Try in an incognito/private browser window**
4. **Check the server logs** for any error messages

## 📋 Current Server Status

✅ Server is running on `https://192.168.10.95:3000`
✅ Environment variables are properly configured
✅ HTTPS is working
🔧 **Azure AD redirect URIs need to be updated** ← THIS IS THE ISSUE

## 🎯 The Fix

The redirect issue is **NOT** a server configuration problem - it's an Azure AD app registration problem. Once you add the correct redirect URIs to your Azure AD app, the authentication will work properly with your internal domain.

**This is the only step needed to fix the localhost redirect issue.**
