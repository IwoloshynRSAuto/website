# Domain and HTTPS Setup Guide

## ✅ Completed Steps

1. **Caddyfile Updated** - `/etc/caddy/Caddyfile` now uses `portal.rsautomation.net`
2. **Environment File Updated** - `.env.production` now has `NEXTAUTH_URL="https://portal.rsautomation.net"`

## 📋 Remaining Steps

### Step 1: Configure DNS A Record

Add an A record in your DNS provider (where rsautomation.net is managed):

```
Type: A
Name: portal
Value: 10.0.0.5
TTL: 3600 (or default)
```

This will make `portal.rsautomation.net` resolve to `10.0.0.5`.

**Wait for DNS propagation** (usually 5-15 minutes, can take up to 48 hours). You can check with:
```bash
dig portal.rsautomation.net
# or
nslookup portal.rsautomation.net
```

### Step 2: Update Azure AD Redirect URI

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your application (the one with the Client ID from `.env.production`)
4. Go to **Authentication** section
5. Under **Redirect URIs**, add:
   ```
   https://portal.rsautomation.net/api/auth/callback/azure-ad
   ```
6. Remove the old redirect URI if it was using the IP address
7. Click **Save**

### Step 3: Reload Caddy (Auto-Get SSL Certificate)

Once DNS is configured and the domain resolves, reload Caddy:

```bash
sudo systemctl reload caddy
```

Or check Caddy status:
```bash
sudo systemctl status caddy
```

Caddy will automatically:
- Detect the domain configuration
- Request an SSL certificate from Let's Encrypt
- Set up HTTPS for `portal.rsautomation.net`

**Note:** Caddy needs the domain to resolve correctly before it can get the SSL certificate. If DNS hasn't propagated yet, wait a few minutes and try again.

### Step 4: Rebuild and Restart Application

```bash
cd /opt/timekeeping-portal

# Rebuild the Next.js application with new environment
npm run build

# Restart via PM2
pm2 restart timekeeping-prod

# Check status
pm2 status
pm2 logs timekeeping-prod
```

### Step 5: Verify HTTPS Setup

1. **Check Caddy logs** for SSL certificate:
   ```bash
   sudo journalctl -u caddy -f
   ```

2. **Test the domain**:
   ```bash
   curl -I https://portal.rsautomation.net
   ```

3. **Verify authentication**:
   - Open `https://portal.rsautomation.net` in a browser
   - Try to sign in with Azure AD
   - Check that cookies are being set (should see `__Secure-next-auth.session-token` in browser DevTools)

## 🔍 Troubleshooting

### If SSL certificate doesn't issue:
- Verify DNS is resolving: `dig portal.rsautomation.net`
- Check Caddy logs: `sudo journalctl -u caddy -n 50`
- Ensure port 80 and 443 are open in firewall
- Wait a few minutes for DNS propagation

### If authentication still fails:
- Verify `NEXTAUTH_URL` in `.env.production` matches the domain
- Check Azure AD redirect URI is correct
- Check PM2 logs: `pm2 logs timekeeping-prod`
- Verify cookies are being set (check browser DevTools → Application → Cookies)

### If Caddy doesn't start:
- Check Caddyfile syntax: `sudo caddy validate --config /etc/caddy/Caddyfile`
- Verify Caddy service: `sudo systemctl status caddy`

## 📝 Quick Command Reference

```bash
# Update DNS (do this first, wait for propagation)
# DNS A record: portal.rsautomation.net → 10.0.0.5

# Check DNS propagation
dig portal.rsautomation.net

# Reload Caddy (after DNS resolves)
sudo systemctl reload caddy

# Check Caddy status and logs
sudo systemctl status caddy
sudo journalctl -u caddy -f

# Rebuild and restart app
cd /opt/timekeeping-portal
npm run build
pm2 restart timekeeping-prod

# Check app logs
pm2 logs timekeeping-prod

# Test HTTPS
curl -I https://portal.rsautomation.net
```

## ✅ Verification Checklist

- [ ] DNS A record created for `portal.rsautomation.net` → `10.0.0.5`
- [ ] DNS resolves correctly (`dig portal.rsautomation.net` shows 10.0.0.5)
- [ ] Azure AD redirect URI updated to `https://portal.rsautomation.net/api/auth/callback/azure-ad`
- [ ] Caddy reloaded and SSL certificate obtained
- [ ] Application rebuilt and restarted
- [ ] HTTPS accessible at `https://portal.rsautomation.net`
- [ ] Authentication works without "State cookie was missing" error

