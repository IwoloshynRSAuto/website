# DNS and SSL Setup - Step by Step

## Current Status
- ✅ Database: All data imported (users, parts, jobs, etc.)
- ✅ Application: Running on http://10.0.0.5
- ⏳ DNS: Not configured yet
- ⏳ SSL: Waiting for DNS

## Step 1: Configure DNS A Record

**In your DNS provider (where rsautomation.net is managed):**

1. Add an **A record**:
   - **Type**: A
   - **Name**: `portal` (this creates `portal.rsautomation.net`)
   - **Value/Points to**: `172.208.88.5` (your public IP)
   - **TTL**: 3600 (or default)

2. **Save the DNS record**

3. **Wait for DNS propagation** (usually 5-15 minutes, can take up to 48 hours)

## Step 2: Verify DNS is Working

Once you've added the DNS record, check if it resolves:

```bash
dig portal.rsautomation.net
# Should return: 172.208.88.5

# Or test with:
nslookup portal.rsautomation.net
```

**Important**: Don't proceed to Step 3 until DNS resolves correctly!

## Step 3: Update Caddyfile

Once DNS is working, update the Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

**Replace contents with:**
```
portal.rsautomation.net {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

**Validate the configuration:**
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

## Step 4: Reload Caddy (Auto-Gets SSL Certificate)

Caddy will automatically request and install a Let's Encrypt SSL certificate:

```bash
sudo systemctl reload caddy
```

**Watch for certificate issuance:**
```bash
sudo journalctl -u caddy -f
```

Look for messages like:
- ✅ "certificate obtained successfully"
- ✅ "serving certificates"

**If certificate fails:**
- Make sure DNS has fully propagated
- Check that port 80 and 443 are open in firewall
- Wait a few more minutes and try again

## Step 5: Update Environment Variables

```bash
cd /opt/timekeeping-portal
nano .env.production
```

**Update NEXTAUTH_URL:**
```
NEXTAUTH_URL="https://portal.rsautomation.net"
```

**Save the file**

## Step 6: Rebuild and Restart Application

```bash
cd /opt/timekeeping-portal
npm run build
pm2 restart timekeeping-prod
```

## Step 7: Verify HTTPS is Working

```bash
# Test HTTPS
curl -I https://portal.rsautomation.net

# Should return HTTP 200 or 307 redirect
```

## Step 8: Add Azure AD Redirect URI

**In Azure Portal:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your application (the one with your Client ID)
4. Go to **Authentication** section
5. Under **Redirect URIs**, click **Add URI**:
   - **Type**: Web
   - **URI**: `https://portal.rsautomation.net/api/auth/callback/azure-ad`
6. Click **Save**

**Optional - Add logout URL:**
- Under **Logout URLs**, add: `https://portal.rsautomation.net`

## Step 9: Test Authentication

1. Open `https://portal.rsautomation.net` in a browser
2. Click "Sign in with Microsoft 365"
3. You should be redirected to Microsoft login
4. After authentication, you'll be redirected back to the secure site

## Quick Command Summary

```bash
# 1. Check DNS (after configuring DNS record)
dig portal.rsautomation.net

# 2. Update Caddyfile (after DNS resolves)
sudo nano /etc/caddy/Caddyfile
# Change to: portal.rsautomation.net { ... }

# 3. Validate and reload Caddy
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy

# 4. Watch for SSL certificate
sudo journalctl -u caddy -f

# 5. Update environment
cd /opt/timekeeping-portal
nano .env.production
# Set: NEXTAUTH_URL="https://portal.rsautomation.net"

# 6. Rebuild and restart
npm run build
pm2 restart timekeeping-prod

# 7. Test HTTPS
curl -I https://portal.rsautomation.net
```

## Troubleshooting

### DNS Not Resolving
- Double-check DNS record is saved correctly
- Wait longer for propagation (can take up to 48 hours)
- Check from multiple locations: `dig portal.rsautomation.net @8.8.8.8`

### SSL Certificate Not Issuing
- Verify DNS resolves: `dig portal.rsautomation.net`
- Check Caddy logs: `sudo journalctl -u caddy -n 50`
- Ensure ports 80 and 443 are open: `sudo ufw status` or check firewall
- Make sure domain is accessible from the internet (Let's Encrypt needs to verify)

### Certificate Issues After Setup
- Check certificate: `echo | openssl s_client -connect portal.rsautomation.net:443 2>/dev/null | openssl x509 -noout -dates`
- View Caddy logs: `sudo journalctl -u caddy -f`

### Authentication Still Fails
- Verify `NEXTAUTH_URL` in `.env.production` is exactly `https://portal.rsautomation.net`
- Check Azure AD redirect URI matches exactly
- Clear browser cache and cookies
- Check PM2 logs: `pm2 logs timekeeping-prod`

## ✅ Verification Checklist

- [ ] DNS A record created: `portal.rsautomation.net` → `172.208.88.5`
- [ ] DNS resolves correctly (`dig portal.rsautomation.net` shows 172.208.88.5)
- [ ] Caddyfile updated with domain
- [ ] Caddy reloaded and SSL certificate obtained
- [ ] `.env.production` updated with `NEXTAUTH_URL="https://portal.rsautomation.net"`
- [ ] Application rebuilt and restarted
- [ ] HTTPS accessible at `https://portal.rsautomation.net`
- [ ] Azure AD redirect URI added: `https://portal.rsautomation.net/api/auth/callback/azure-ad`
- [ ] Authentication works without errors


