# ✅ Server Setup Complete

## 🎉 All Systems Operational

### Database Status
- ✅ **Connection**: PostgreSQL working correctly
- ✅ **Migrations**: Fixed migration history (SQLite → PostgreSQL)
- ✅ **Data Import**: Successfully imported from backup
- ✅ **Content**: 
  - 3 users
  - 1 customer
  - 28 labor codes
  - 1 quote
  - 1 job

### Application Status
- ✅ **Build**: Successfully compiled
- ✅ **Server**: Running via PM2 (`timekeeping-prod`)
- ✅ **Reverse Proxy**: Caddy configured for HTTP on port 80
- ✅ **Authentication**: Configured for IP-based HTTP access

### Access Information
- **Application URL**: http://172.208.88.5
- **Prisma Studio**: http://172.208.88.5:5555 (when running)

## 🔧 Quick Commands

### Check Application Status
```bash
pm2 status
pm2 logs timekeeping-prod
```

### Check Caddy Status
```bash
sudo systemctl status caddy
```

### Access Prisma Studio
```bash
cd /opt/timekeeping-portal
./scripts/start-prisma-studio.sh
# Then open: http://172.208.88.5:5555
```

### Rebuild and Restart
```bash
cd /opt/timekeeping-portal
npm run build
pm2 restart timekeeping-prod
```

## 📊 Database Management

### View Database Content
```bash
cd /opt/timekeeping-portal
PGPASSWORD=4015OakOrchard psql -h 127.0.0.1 -U afp -d automation_firm_db
```

### Quick Table Counts
```bash
cd /opt/timekeeping-portal
PGPASSWORD=4015OakOrchard psql -h 127.0.0.1 -U afp -d automation_firm_db -c "
SELECT 'users' as table_name, COUNT(*) FROM users 
UNION ALL SELECT 'jobs', COUNT(*) FROM jobs 
UNION ALL SELECT 'customers', COUNT(*) FROM customers 
UNION ALL SELECT 'quotes', COUNT(*) FROM quotes 
ORDER BY table_name;"
```

## 🔄 Future Domain Migration

When ready to set up `portal.rsautomation.net` with SSL:

1. **Update Caddyfile**:
   ```bash
   sudo nano /etc/caddy/Caddyfile
   # Change to:
   portal.rsautomation.net {
     encode zstd gzip
     reverse_proxy 127.0.0.1:3000
   }
   ```

2. **Update `.env.production`**:
   ```bash
   NEXTAUTH_URL="https://portal.rsautomation.net"
   ```

3. **Configure DNS**: A record `portal.rsautomation.net` → `172.208.88.5`

4. **Reload Services**:
   ```bash
   sudo systemctl reload caddy
   cd /opt/timekeeping-portal
   npm run build
   pm2 restart timekeeping-prod
   ```

The auth configuration will automatically switch to HTTPS secure cookies when it detects a domain.

## 📝 Configuration Files

- **Caddyfile**: `/etc/caddy/Caddyfile`
- **Environment**: `/opt/timekeeping-portal/.env.production`
- **Auth Config**: `/opt/timekeeping-portal/lib/auth.ts`
- **Prisma Schema**: `/opt/timekeeping-portal/prisma/schema.prisma`

## 🛠️ Troubleshooting

### Application Not Responding
```bash
# Check PM2
pm2 logs timekeeping-prod

# Check Caddy
sudo journalctl -u caddy -n 50

# Check if port 80 is listening
sudo ss -tlnp | grep :80
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
PGPASSWORD=4015OakOrchard psql -h 127.0.0.1 -U afp -d automation_firm_db -c "SELECT 1;"

# Check Docker container (if using Docker)
docker ps | grep postgres
```

### Authentication Issues
- Verify `NEXTAUTH_URL` in `.env.production` matches the server URL
- For IP access, must use `http://` (not `https://`)
- Check Azure AD redirect URIs match current URL
- Review PM2 logs for authentication errors

## ✅ Verification Checklist

- [x] Database connected and populated
- [x] Application built successfully
- [x] PM2 process running
- [x] Caddy serving on port 80
- [x] Site accessible at http://172.208.88.5
- [x] Prisma Studio script ready
- [x] Auth configured for IP-based access
- [x] Ready for future domain migration

