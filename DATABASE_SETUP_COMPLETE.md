# Database Setup Complete ✅

## ✅ Completed Tasks

1. **Fixed Migration History** - Updated `migration_lock.toml` from SQLite to PostgreSQL
2. **Imported Database Data** - Successfully imported from `backup-2025-11-04.json`
3. **Database Content Verified**:
   - 3 users
   - 1 customer
   - 28 labor codes
   - 1 quote
   - 1 job
   - 0 time entries (empty, as expected)

## 🌐 Server Configuration

### IP Address Access
- **Server IP**: `172.208.88.5`
- **Caddyfile**: Updated to serve HTTP on IP address
- **NEXTAUTH_URL**: `http://172.208.88.5`
- **Auth Configuration**: Automatically uses HTTP cookies for IP addresses (no HTTPS required)

### Next Steps to Restart Application

```bash
# 1. Reload Caddy configuration
sudo systemctl reload caddy

# 2. Rebuild the Next.js application
cd /opt/timekeeping-portal
npm run build

# 3. Restart the application via PM2
pm2 restart timekeeping-prod

# 4. Check status
pm2 status
pm2 logs timekeeping-prod
```

## 📊 Database Management with Prisma Studio

### Option 1: Run Prisma Studio Directly

```bash
cd /opt/timekeeping-portal
./scripts/start-prisma-studio.sh
```

Then access at: **http://172.208.88.5:5555**

### Option 2: Run via npm script

```bash
cd /opt/timekeeping-portal
npm run db:studio -- --port 5555 --hostname 0.0.0.0
```

### Option 3: Run in Background with PM2 (Optional)

```bash
cd /opt/timekeeping-portal
pm2 start "npm run db:studio -- --port 5555 --hostname 0.0.0.0" --name prisma-studio
pm2 save
```

Access at: **http://172.208.88.5:5555**

**Note**: Prisma Studio should be stopped when not in use for security reasons.

## 🔍 Database Verification

### Check Database Connection
```bash
cd /opt/timekeeping-portal
PGPASSWORD=4015OakOrchard psql -h 127.0.0.1 -U afp -d automation_firm_db -c "SELECT COUNT(*) FROM users;"
```

### View Table Counts
```bash
cd /opt/timekeeping-portal
PGPASSWORD=4015OakOrchard psql -h 127.0.0.1 -U afp -d automation_firm_db -c "
SELECT 
  'users' as table_name, COUNT(*) as count FROM users 
UNION ALL SELECT 'jobs', COUNT(*) FROM jobs 
UNION ALL SELECT 'customers', COUNT(*) FROM customers 
UNION ALL SELECT 'quotes', COUNT(*) FROM quotes 
UNION ALL SELECT 'time_entries', COUNT(*) FROM time_entries 
UNION ALL SELECT 'labor_codes', COUNT(*) FROM labor_codes 
ORDER BY table_name;"
```

## 🔄 Future Domain Setup (portal.rsautomation.net)

When you're ready to set up the domain with SSL:

1. **Update Caddyfile** to use domain:
   ```bash
   sudo nano /etc/caddy/Caddyfile
   # Change to: portal.rsautomation.net { ... }
   ```

2. **Update NEXTAUTH_URL** in `.env.production`:
   ```bash
   NEXTAUTH_URL="https://portal.rsautomation.net"
   ```

3. **Configure DNS** A record: `portal.rsautomation.net` → `172.208.88.5`

4. **Reload Caddy** (will auto-get SSL certificate):
   ```bash
   sudo systemctl reload caddy
   ```

5. **Rebuild and restart**:
   ```bash
   cd /opt/timekeeping-portal
   npm run build
   pm2 restart timekeeping-prod
   ```

The auth configuration will automatically switch to HTTPS secure cookies when it detects a domain (not IP address).

## 📝 Database Import/Export

### Export Database
```bash
cd /opt/timekeeping-portal
npm run db:export
```

### Import Database
```bash
cd /opt/timekeeping-portal
node scripts/import-data.js backup-2025-11-04.json
```

## 🛠️ Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `docker ps` or `systemctl status postgresql`
- Check DATABASE_URL in `.env.production`
- Test connection: `PGPASSWORD=4015OakOrchard psql -h 127.0.0.1 -U afp -d automation_firm_db`

### Application Not Loading Data
- Check PM2 logs: `pm2 logs timekeeping-prod`
- Verify Prisma Client is generated: `npx prisma generate`
- Check database has data (use Prisma Studio or SQL queries above)

### Authentication Issues
- Verify `NEXTAUTH_URL` matches the server URL
- Check Azure AD redirect URIs match the current URL
- For IP access, ensure using `http://` (not `https://`)
- Check PM2 logs for authentication errors

