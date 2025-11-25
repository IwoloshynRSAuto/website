# eBay API Setup - Quick Checklist

Use this checklist to track your progress setting up eBay API access.

## Pre-Setup Requirements

- [ ] Active eBay seller account (the account that will create listings)
- [ ] eBay account in good standing (no restrictions)
- [ ] Payment method on file with eBay
- [ ] Email and phone verified on eBay account

## Step 1: Developer Account

- [ ] Go to https://developer.ebay.com/
- [ ] Sign in with eBay account (or create new eBay account first)
- [ ] Complete developer profile if prompted

## Step 2: Register Application

- [ ] Navigate to: https://developer.ebay.com/my/keys
- [ ] Click "Create an App Key" or "Create a keyset"
- [ ] Enter Application Title: "eBay Listing Automation" (or your choice)
- [ ] Select App Purpose: **"Sell on eBay"**
- [ ] Select Environment: **"Production"** (or "Sandbox" for testing)
- [ ] Enter OAuth Redirect URI: `http://YOUR_IP:5000/api/ebay/callback`
- [ ] Click "Create"
- [ ] **IMMEDIATELY copy and save:**
  - [ ] App ID (Client ID)
  - [ ] Cert ID (Client Secret) - click "Show" if hidden
  - [ ] Dev ID (optional, but save it)

## Step 3: Configure Environment Variables

- [ ] Open `backend/.env` file
- [ ] Add `EBAY_APP_ID=your_app_id_here`
- [ ] Add `EBAY_CERT_ID=your_cert_id_here`
- [ ] Add `EBAY_REDIRECT_URI=http://YOUR_IP:5000/api/ebay/callback`
- [ ] Verify redirect URI matches exactly what you entered in Step 2
- [ ] Save the file

## Step 4: Business Policies (Optional but Recommended)

- [ ] Log into eBay.com
- [ ] Go to: "My eBay" → "Account" → "Site Preferences"
- [ ] Click "Business Policies"
- [ ] Create or verify policies exist for:
  - [ ] Payment Policy
  - [ ] Fulfillment Policy (Shipping)
  - [ ] Return Policy
- [ ] Copy Policy IDs (12-digit numbers)
- [ ] Add to `.env` file (optional - app can create via API):
  - [ ] `EBAY_FULFILLMENT_POLICY_ID=`
  - [ ] `EBAY_PAYMENT_POLICY_ID=`
  - [ ] `EBAY_RETURN_POLICY_ID=`

## Step 5: Inventory Location

- [ ] Log into eBay.com
- [ ] Go to: "My eBay" → "Account" → "Shipping Preferences"
- [ ] Click "Inventory Locations"
- [ ] Add at least one location with:
  - [ ] Location name
  - [ ] Full address
  - [ ] Phone number
- [ ] Save location

## Step 6: OAuth Authorization

- [ ] Start backend server: `cd backend && npm start`
- [ ] Open browser: `http://YOUR_IP:5000/api/ebay/auth?userId=1`
- [ ] Log in with eBay seller account
- [ ] Review permissions and click "Agree and Authorize"
- [ ] Verify redirect back to your app
- [ ] Check database for stored tokens (User.metadata field)

## Step 7: Production Access (if required)

- [ ] Check Developer Portal for "Request Production Access" button
- [ ] If visible, fill out form:
  - [ ] Use case description
  - [ ] Expected listing volume
  - [ ] Business information (if applicable)
- [ ] Submit and wait for approval (1-3 business days)
- [ ] Verify approval status

## Step 8: Verification

- [ ] Verify tokens in database (User.metadata)
- [ ] Test listing creation in your app
- [ ] Check for any error messages
- [ ] Verify listing appears on eBay (if using production)

## Information to Provide

Once complete, you should have:

✅ **EBAY_APP_ID**: `___________________________`  
✅ **EBAY_CERT_ID**: `___________________________`  
✅ **EBAY_REDIRECT_URI**: `___________________________`  
✅ **OAuth tokens**: Stored in database (automatic)  
✅ **Business Policy IDs** (optional): `___________________________`

## Troubleshooting

If you encounter issues, check:

- [ ] Redirect URI matches exactly in both places
- [ ] App purpose is "Sell on eBay"
- [ ] eBay account is active and in good standing
- [ ] Business policies exist (or policy IDs in .env)
- [ ] Inventory location created
- [ ] Production access granted (if required)
- [ ] OAuth authorization completed successfully

## Next Steps

After completing this checklist:

1. Provide the credentials above
2. Verify your app can connect to eBay
3. Test creating a listing
4. Monitor for any errors

---

**See `EBAY_SETUP.md` for detailed explanations of each step.**

