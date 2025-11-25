# Complete eBay API Setup Guide for Auto-Listing

This guide provides **everything you need** to set up eBay API access for auto-listing functionality in your application.

---

## Table of Contents

1. [eBay Developer Account Requirements](#1-ebay-developer-account-requirements)
2. [Application Registration](#2-application-registration)
3. [Required Credentials](#3-required-credentials)
4. [OAuth Scopes & Permissions](#4-oauth-scopes--permissions)
5. [Business Verification & API Approval](#5-business-verification--api-approval)
6. [URLs & Settings Configuration](#6-urls--settings-configuration)
7. [Prerequisites for Listing Creation](#7-prerequisites-for-listing-creation)
8. [Step-by-Step Setup Instructions](#8-step-by-step-setup-instructions)

---

## 1. eBay Developer Account Requirements

### What Account You Need

**You need a standard eBay Developer Program account** - this is the same as your regular eBay account.

- **URL**: https://developer.ebay.com/
- **Sign In**: Use your existing eBay account credentials (or create a new eBay account first)
- **Cost**: Free to register and get API keys
- **Account Type**: Personal or Business eBay account works (business verification may be required for production use - see Section 5)

### Important Notes

- The Developer Program account is **linked to your eBay seller account**
- You must have an active eBay seller account to use the Sell APIs
- The account you use for API access will be the account that creates listings

---

## 2. Application Registration

### Yes, You Must Register an Application

**You MUST register an application** in the eBay Developer Program to get API credentials.

### Registration Process

1. **Navigate to Application Keys**
   - After logging into https://developer.ebay.com/
   - Go to: **"My Account"** → **"Keys"** (or "Application Keys")
   - Or directly: https://developer.ebay.com/my/keys

2. **Create Application**
   - Click **"Create an App Key"** or **"Create a keyset"**
   - You'll be prompted to enter an **Application Title** (e.g., "eBay Listing Automation")

3. **Application Details**
   - **App Name**: Choose any descriptive name (e.g., "My Listing Automation App")
   - **App Purpose**: Select **"Sell on eBay"** (required for listing creation)
   - **Environment**: Choose **Production** (or Sandbox for testing first)

4. **OAuth Redirect URI**
   - You'll be asked to provide a **Redirect URI**
   - This is where eBay sends users after authorization
   - **Format**: `http://YOUR_IP_OR_DOMAIN:PORT/api/ebay/callback`
   - **Example**: `http://192.168.10.70:5000/api/ebay/callback`
   - **Important**: This must match exactly what you configure in your app

5. **Submit & Receive Credentials**
   - After creating the app, you'll immediately receive your credentials
   - **Save these immediately** - you may not be able to view them again later

6. **Enable Your Keyset (IMPORTANT)**
   - After creating your app, you may see a message: **"Your Keyset is currently disabled"**
   - This happens because eBay requires marketplace account deletion notifications
   - **You have two options:**

   **Option A: Apply for Exemption (Easiest - Recommended)**
   1. Go to: https://developer.ebay.com/my/push/ (Alerts & Notifications page)
   2. Select your application and "Production" environment
   3. Find the "Marketplace Account Deletion" section
   4. Toggle **"Exempted from Marketplace Account Deletion"** to **ON**
   5. Click "Save"
   6. Your keyset should be enabled within a few minutes

   **Option B: Set Up Notification Endpoint (Advanced)**
   1. Create an HTTPS endpoint in your app that can receive POST requests
   2. Go to: https://developer.ebay.com/my/push/
   3. Enter your endpoint URL (must be HTTPS)
   4. Generate and enter a verification token
   5. Add an email for failure notifications
   6. Click "Save" and verify the endpoint

   **Note**: For most auto-listing use cases, Option A (exemption) is sufficient and easier.

---

## 3. Required Credentials

### Credentials You'll Receive

When you register your application, eBay provides **three main credentials**:

#### 1. **App ID** (also called Client ID)
- **What it is**: Identifies your application to eBay
- **Format**: Usually a long alphanumeric string (e.g., `YourAppName-Prod-1234-5678-abcd-efgh`)
- **Required for**: All API calls, OAuth authentication
- **Where to find**: Developer Portal → My Account → Keys → Your App

#### 2. **Cert ID** (also called Client Secret)
- **What it is**: Secret key used for secure authentication
- **Format**: Long alphanumeric string (e.g., `Prod-12345678-90ab-cdef-ghij-klmnopqrstuv`)
- **Required for**: OAuth token exchange, token refresh
- **Security**: Keep this secret! Never expose it in client-side code
- **Where to find**: Same location as App ID (may need to click "Show" to reveal)

#### 3. **Dev ID** (Developer ID)
- **What it is**: Identifies your developer account
- **Format**: Alphanumeric string
- **Required for**: Some legacy APIs (Trading API), but **NOT required** for modern Sell/Inventory APIs
- **Note**: Your app uses OAuth 2.0, so Dev ID is typically not needed for auto-listing

### Credentials Required for Auto-Listing

**For auto-listing functionality, you need:**

✅ **App ID** (Client ID) - **REQUIRED**  
✅ **Cert ID** (Client Secret) - **REQUIRED**  
✅ **OAuth Access Token** - **REQUIRED** (obtained via OAuth flow)  
✅ **OAuth Refresh Token** - **REQUIRED** (obtained via OAuth flow)  
❌ **Dev ID** - **NOT REQUIRED** for Sell/Inventory APIs

### OAuth Tokens

**OAuth tokens are obtained through the authorization flow**, not from the Developer Portal:

- **Access Token**: Short-lived (typically 2 hours), used for API calls
- **Refresh Token**: Long-lived, used to get new access tokens
- **How to get**: User authorizes your app → eBay redirects with code → Exchange code for tokens

---

## 4. OAuth Scopes & Permissions

### Required Scopes for Listing Creation

Your application must request these OAuth scopes to create listings:

#### Primary Scopes (Required)

1. **`https://api.ebay.com/oauth/api_scope/sell.inventory`**
   - **Purpose**: Create, update, and manage inventory offers/listings
   - **Required for**: Creating draft listings, publishing offers
   - **Status**: **MANDATORY** for auto-listing

2. **`https://api.ebay.com/oauth/api_scope/sell.marketing`**
   - **Purpose**: Manage promotions and marketing campaigns
   - **Required for**: Some advanced listing features
   - **Status**: **Recommended** (may be needed for certain listing types)

3. **`https://api.ebay.com/oauth/api_scope/sell.account`**
   - **Purpose**: Access account information, business policies
   - **Required for**: Retrieving payment/shipping/return policies
   - **Status**: **Recommended** (helps with policy management)

#### Additional Scope

4. **`https://api.ebay.com/oauth/api_scope`**
   - **Purpose**: Basic API access
   - **Status**: **Included by default** in most flows

### How Scopes Are Requested

- **In your app**: Scopes are automatically requested when users authorize
- **In Developer Portal**: You don't need to pre-configure scopes
- **User consent**: Users see what permissions you're requesting during authorization

### Current Implementation

Your app currently requests these scopes (see `backend/src/services/ebayService.js`):
```javascript
const scopes = [
    'https://api.ebay.com/oauth/api_scope',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.marketing',
    'https://api.ebay.com/oauth/api_scope/sell.account'
].join(' ');
```

**This is correct** - no changes needed.

---

## 5. Business Verification & API Approval

### Do You Need Business Verification?

**Short answer**: It depends on your use case and account status.

#### For Sandbox/Testing
- ❌ **No business verification required**
- ✅ You can test immediately with sandbox keys

#### For Production
- ⚠️ **May be required** depending on:
  - Your account type (personal vs. business)
  - Your selling history
  - Volume of listings you plan to create
  - eBay's current policies

### Verification Requirements

**eBay may require verification for:**

1. **Sell API Access**
   - New accounts or accounts with limited selling history
   - High-volume listing applications
   - Business accounts (sometimes)

2. **Trading API** (legacy)
   - More likely to require verification
   - **Note**: Your app uses the modern Sell/Inventory API, not Trading API

3. **Production Access**
   - Some accounts can use production APIs immediately
   - Others may need to request production access

### How to Check/Request Access

1. **Check Your Account Status**
   - Log into https://developer.ebay.com/
   - Go to "My Account" → Check for any warnings or restrictions
   - Look for "Production Access" status

2. **Request Production Access** (if needed)
   - Some accounts see a "Request Production Access" button
   - Fill out the form with:
     - Business information
     - Use case description
     - Expected listing volume
   - Approval typically takes 1-3 business days

3. **Account Verification**
   - eBay may ask you to verify:
     - Phone number
     - Email address
     - Business registration (for business accounts)
     - Payment method on file

### What to Provide eBay

If verification is required, eBay may ask for:

- **Business name** (if business account)
- **Tax ID** (for business accounts in some regions)
- **Use case description**: "Automated listing creation for inventory management"
- **Expected volume**: Number of listings per month
- **Account information**: eBay seller account details

### Current Status

**Your app is configured for production** (see `backend/src/services/ebayService.js`):
```javascript
const EBAY_API_BASE = 'https://api.ebay.com'; // Production
```

**Action needed**: Ensure your eBay account has production API access before using.

---

## 6. URLs & Settings Configuration

### Redirect URI Configuration

**This is critical** - the redirect URI must match exactly in both places.

#### In eBay Developer Portal

1. Go to: https://developer.ebay.com/my/keys
2. Find your application
3. Edit the application settings
4. Set **OAuth Redirect URI** to:
   ```
   http://YOUR_SERVER_IP:5000/api/ebay/callback
   ```
   Or if using a domain:
   ```
   https://yourdomain.com/api/ebay/callback
   ```

#### In Your Application (.env file)

Set `EBAY_REDIRECT_URI` to match exactly:
```env
EBAY_REDIRECT_URI=http://YOUR_SERVER_IP:5000/api/ebay/callback
```

**Important Notes:**
- Must match **exactly** (including http/https, port, path)
- No trailing slashes
- Case-sensitive
- Can add multiple redirect URIs in eBay portal (one per line)

### Sandbox vs Production

#### Sandbox Environment
- **Purpose**: Testing and development
- **URL**: `https://api.sandbox.ebay.com`
- **Keys**: Separate App ID and Cert ID from production
- **Data**: Fake/test data, no real listings
- **When to use**: During development and testing

#### Production Environment
- **Purpose**: Live, real listings
- **URL**: `https://api.ebay.com` (what your app uses)
- **Keys**: Separate App ID and Cert ID from sandbox
- **Data**: Real listings on eBay
- **When to use**: After testing is complete

**Your app is configured for production only** - if you want to test with sandbox first, you'll need to:
1. Create a sandbox keyset in Developer Portal
2. Update `EBAY_API_BASE` in `ebayService.js` to sandbox URL
3. Use sandbox App ID and Cert ID

### Environment Variables Required

Add these to your `backend/.env` file:

```env
# Required - From eBay Developer Portal
EBAY_APP_ID=YourAppName-Prod-1234-5678-abcd-efgh
EBAY_CERT_ID=Prod-12345678-90ab-cdef-ghij-klmnopqrstuv
EBAY_REDIRECT_URI=http://192.168.10.70:5000/api/ebay/callback

# Optional - Only if you get policy errors
EBAY_FULFILLMENT_POLICY_ID=123456789012
EBAY_PAYMENT_POLICY_ID=123456789012
EBAY_RETURN_POLICY_ID=123456789012
```

---

## 7. Prerequisites for Listing Creation

### Before You Can Create Listings

These must be completed **before** your first API listing:

#### 1. eBay Account Setup

✅ **Active eBay Seller Account**
- Must be in good standing
- No restrictions or suspensions
- Verified email and phone number

✅ **Payment Method on File**
- Valid payment method for eBay fees
- PayPal or credit card linked

#### 2. Business Policies (Required)

**eBay requires business policies** for all listings. You have two options:

**Option A: Use Existing Policies (Recommended)**
- Log into eBay → "My eBay" → "Account" → "Site Preferences"
- Go to "Business Policies"
- Create or use existing policies for:
  - **Payment Policy**: How buyers pay
  - **Fulfillment Policy**: Shipping methods and costs
  - **Return Policy**: Return terms and conditions
- Copy the **Policy IDs** (12-digit numbers)
- Add to `.env` file (optional - app can retrieve automatically if you have `sell.account` scope)

**Option B: Create Policies via API**
- Use the Account API to create policies programmatically
- Requires `sell.account` scope (which you have)

#### 3. Inventory Location (Required for Inventory API)

**You must create at least one inventory location:**

- Use the Account API: `POST /sell/account/v1/location`
- Or create via eBay website: "My eBay" → "Account" → "Shipping Preferences" → "Inventory Locations"
- Required fields:
  - Location name
  - Address
  - Phone number

#### 4. Marketplace Onboarding

✅ **Account must be onboarded to target marketplace**
- For US listings: Account must be able to sell on eBay.com
- Check: Can you manually create a listing on eBay.com?
- If yes, you're onboarded

#### 5. OAuth Authorization

✅ **User must authorize your app**
- One-time process
- User grants permissions
- App receives access and refresh tokens
- Tokens stored in database

### Checklist Before First Listing

- [ ] eBay Developer account created
- [ ] Application registered in Developer Portal
- [ ] App ID and Cert ID obtained
- [ ] Redirect URI configured (matches in both places)
- [ ] Environment variables set in `.env`
- [ ] eBay seller account active and in good standing
- [ ] Business policies created (or policy IDs in `.env`)
- [ ] Inventory location created
- [ ] OAuth authorization completed (user authorized app)
- [ ] Production API access granted (if required)

---

## 8. Step-by-Step Setup Instructions

### Complete Setup Process

Follow these steps in order:

#### Step 1: Create eBay Developer Account

1. Go to https://developer.ebay.com/
2. Click "Sign In" (use your eBay account) or "Register" (create new eBay account first)
3. Complete any required profile information

#### Step 2: Register Your Application

1. After logging in, go to: https://developer.ebay.com/my/keys
2. Click **"Create an App Key"** or **"Create a keyset"**
3. Fill in the form:
   - **Application Title**: "eBay Listing Automation" (or your choice)
   - **App Purpose**: Select **"Sell on eBay"**
   - **Environment**: Select **"Production"** (or "Sandbox" for testing)
   - **OAuth Redirect URI**: Enter your callback URL
     - Example: `http://192.168.10.70:5000/api/ebay/callback`
     - Replace with your actual server IP/domain
4. Click **"Create"** or **"Save"**
5. **IMMEDIATELY copy and save**:
   - **App ID** (Client ID)
   - **Cert ID** (Client Secret) - click "Show" if hidden
   - **Dev ID** (optional, but save it anyway)

#### Step 3: Configure Environment Variables

1. Open `backend/.env` file (create if it doesn't exist)
2. Add these lines:
   ```env
   EBAY_APP_ID=your_app_id_from_step_2
   EBAY_CERT_ID=your_cert_id_from_step_2
   EBAY_REDIRECT_URI=http://YOUR_IP:5000/api/ebay/callback
   ```
3. Replace placeholders with actual values
4. Save the file

#### Step 4: Set Up Business Policies (if needed)

**Option A: Via eBay Website (Easier)**
1. Log into eBay.com
2. Go to: "My eBay" → "Account" → "Site Preferences"
3. Click "Business Policies"
4. Create policies for:
   - Payment
   - Shipping (Fulfillment)
   - Returns
5. Copy the Policy IDs (12-digit numbers)
6. Add to `.env`:
   ```env
   EBAY_FULFILLMENT_POLICY_ID=123456789012
   EBAY_PAYMENT_POLICY_ID=123456789012
   EBAY_RETURN_POLICY_ID=123456789012
   ```

**Option B: Via API (Advanced)**
- Your app can create policies automatically if you have `sell.account` scope
- Policies will be created on first listing if not provided

#### Step 5: Create Inventory Location

**Via eBay Website:**
1. Log into eBay.com
2. Go to: "My eBay" → "Account" → "Shipping Preferences"
3. Click "Inventory Locations"
4. Add a location with:
   - Name (e.g., "Main Warehouse")
   - Full address
   - Phone number
5. Save

**Via API:**
- Your app can create locations programmatically using Account API

#### Step 6: Authorize Your Application

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Open browser and go to:
   ```
   http://YOUR_IP:5000/api/ebay/auth?userId=1
   ```
   (Replace `YOUR_IP` with your server IP, and `userId` with actual user ID)

3. You'll be redirected to eBay's authorization page

4. **Log in with your eBay seller account** (the account that will create listings)

5. Review the permissions requested and click **"Agree and Authorize"**

6. eBay redirects back to your app with authorization code

7. Your app automatically:
   - Exchanges code for access/refresh tokens
   - Stores tokens in database
   - Redirects you to frontend

#### Step 7: Verify Setup

1. Check that tokens were saved:
   - Check your database `User` table
   - Look in `metadata` field for `ebayAccessToken` and `ebayRefreshToken`

2. Test listing creation:
   - Create a test listing in your app
   - Try uploading to eBay
   - Check for any errors

#### Step 8: Handle Production Access (if needed)

If you get errors about production access:

1. Go to https://developer.ebay.com/my/keys
2. Check for "Request Production Access" button
3. Fill out the form:
   - Use case: "Automated listing creation"
   - Expected volume: Your estimated listings per month
   - Business information (if applicable)
4. Wait for approval (1-3 business days)
5. Once approved, retry your API calls

---

## Summary: What to Provide

### Information You Need to Give Me/Configure

Once you complete the setup above, provide these values:

1. **EBAY_APP_ID**: From Developer Portal → My Account → Keys
2. **EBAY_CERT_ID**: From Developer Portal → My Account → Keys  
3. **EBAY_REDIRECT_URI**: Your callback URL (e.g., `http://192.168.10.70:5000/api/ebay/callback`)
4. **EBAY_FULFILLMENT_POLICY_ID**: (Optional) From Business Policies
5. **EBAY_PAYMENT_POLICY_ID**: (Optional) From Business Policies
6. **EBAY_RETURN_POLICY_ID**: (Optional) From Business Policies

### After Setup

- ✅ Credentials configured in `.env`
- ✅ OAuth authorization completed
- ✅ Tokens stored in database
- ✅ Ready to create listings via API

---

## Troubleshooting

### Common Issues

**"Invalid redirect URI"**
- Redirect URI in Developer Portal must match `.env` exactly
- Check for http vs https, port numbers, trailing slashes

**"Insufficient permissions"**
- Ensure app purpose is "Sell on eBay"
- Verify OAuth scopes include `sell.inventory`

**"Policy ID not found"**
- Create business policies in eBay account
- Add policy IDs to `.env` or let app create them via API

**"Production access denied"**
- Request production access in Developer Portal
- Wait for approval (1-3 business days)

**"Token expired"**
- App should auto-refresh tokens
- If refresh fails, re-authorize: `/api/ebay/auth`

**"Account not onboarded"**
- Ensure eBay seller account can create listings manually
- Complete any required account verification steps

---

## Additional Resources

- **eBay Developer Portal**: https://developer.ebay.com/
- **API Documentation**: https://developer.ebay.com/api-docs
- **Sell Inventory API**: https://developer.ebay.com/api-docs/sell/inventory/overview.html
- **OAuth Guide**: https://developer.ebay.com/api-docs/static/oauth2-token.html
- **Business Policies**: https://developer.ebay.com/api-docs/sell/account/overview.html

---

**Ready to proceed?** Complete the steps above and provide the credentials, then we can connect your app to eBay's auto-listing functionality!
