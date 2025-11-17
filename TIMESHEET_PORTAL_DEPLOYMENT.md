# Timesheet Portal - Deployment Guide

## Overview

The Timesheet Portal has been rebuilt with the following features:
- Clock in/out with automatic 15-minute rounding
- Job tracking with automatic job switching
- Inline editing of timesheet entries
- Cross-device persistence with auto-sync
- Mobile-responsive design
- Comprehensive validation and rate limiting

## Database Schema

### New Models

**Timesheet**
- `id`: String (CUID)
- `userId`: String (foreign key to User)
- `date`: DateTime (unique per user-date)
- `clockInTime`: DateTime (rounded to 15 min)
- `clockOutTime`: DateTime? (rounded to 15 min)
- `totalHours`: Float?
- `status`: String (in-progress, completed, needs-review)
- `createdAt`: DateTime
- `updatedAt`: DateTime

**JobEntry**
- `id`: String (CUID)
- `timesheetId`: String (foreign key to Timesheet)
- `jobNumber`: String
- `laborCode`: String
- `punchInTime`: DateTime (rounded to 15 min)
- `punchOutTime`: DateTime? (rounded to 15 min)
- `notes`: String?
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Migration

Run the Prisma migration:
```bash
npx prisma migrate dev --name add_timesheet_models
# or for production:
npx prisma migrate deploy
```

## API Endpoints

### POST /api/timesheets
**Create new timesheet**
- Body: `{ clockInTime: string (ISO), date?: string (ISO) }`
- Returns: Created timesheet with jobEntries
- Validations:
  - One timesheet per user per date
  - Rate limited (10 req/min)
- Auto-rounds clockInTime to nearest 15 minutes

### GET /api/timesheets
**List timesheets**
- Query params: `userId` (optional, defaults to current user)
- Returns: Array of timesheets with jobEntries
- Admin can view all users' timesheets

### PATCH /api/timesheets/:id
**Update timesheet**
- Body: `{ clockInTime?: string, clockOutTime?: string | null, status?: string }`
- Returns: Updated timesheet
- Validations:
  - Clock out must be after clock in
  - Rate limited (10 req/min)
  - Auto-closes all active jobs when clocking out
- Auto-rounds times to nearest 15 minutes

### POST /api/timesheets/:id/jobs
**Add job entry to timesheet**
- Body: `{ jobNumber: string, laborCode: string, punchInTime: string (ISO), notes?: string }`
- Returns: Created job entry
- Validations:
  - No duplicate active labor codes
  - Cannot add to completed timesheet
  - Rate limited (10 req/min)
- Auto-clocks out previous active job
- Auto-rounds punchInTime to nearest 15 minutes

### PATCH /api/jobs/:id
**Update job entry**
- Body: `{ punchInTime?: string, punchOutTime?: string | null, notes?: string }`
- Returns: Updated job entry
- Validations:
  - Punch out must be after punch in
  - Rate limited (10 req/min)
- Auto-rounds times to nearest 15 minutes

## Environment Variables

Ensure these are set in `.env.production`:
```
NEXTAUTH_URL=https://portal.rsautomation.net
NEXTAUTH_SECRET=<your-secret>
MICROSOFT_CLIENT_ID=<your-client-id>
MICROSOFT_CLIENT_SECRET=<your-client-secret>
MICROSOFT_TENANT_ID=<your-tenant-id>
DATABASE_URL=<your-database-url>
```

## Deployment Steps

### 1. Pre-Deployment
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run database migration
npx prisma migrate deploy

# Build the application
npm run build
```

### 2. Deploy with PM2
```bash
# Stop current process
pm2 stop timekeeping-prod

# Start with new code
pm2 start ecosystem.config.js

# Or restart
pm2 restart timekeeping-prod

# Check status
pm2 status
pm2 logs timekeeping-prod
```

### 3. Verify Deployment
1. Check PM2 process is running
2. Verify application loads at production URL
3. Test authentication flow
4. Run smoke tests (see QA Checklist)

## Rollback Procedure

If issues are discovered:

```bash
# 1. Revert to previous commit
git revert HEAD
# or
git reset --hard <previous-commit-hash>

# 2. Rebuild
npm run build

# 3. Restart PM2
pm2 restart timekeeping-prod

# 4. Clear Next.js cache if needed
rm -rf .next
pm2 restart timekeeping-prod
```

## Monitoring

### Check Application Health
- PM2 logs: `pm2 logs timekeeping-prod`
- Application URL: https://portal.rsautomation.net/dashboard/timekeeping/punch
- Database: Check Prisma Studio or direct DB connection

### Common Issues

**Issue: Timesheet Portal not loading**
- Check PM2 process: `pm2 status`
- Check logs: `pm2 logs timekeeping-prod`
- Verify build: `npm run build`
- Clear cache: `rm -rf .next && pm2 restart timekeeping-prod`

**Issue: Authentication errors**
- Verify `NEXTAUTH_URL` is set correctly
- Check Azure AD redirect URIs include production URL
- Verify environment variables loaded: `pm2 env timekeeping-prod`

**Issue: Database errors**
- Verify migration ran: `npx prisma migrate status`
- Check database connection: `npx prisma db pull`
- Verify schema matches: `npx prisma validate`

**Issue: Rate limiting too strict**
- Adjust `RATE_LIMIT_MAX_REQUESTS` in API route files
- Current: 10 requests per minute per user

## Performance Considerations

- Rate limiting: 10 requests/minute per user (in-memory, resets on restart)
- Auto-sync: Every 30 seconds when clocked in
- LocalStorage: Draft state saved per user per device
- Database: Indexed on `userId_date` for fast lookups

## Security Notes

- All endpoints require authentication
- Users can only modify their own timesheets (unless admin)
- Rate limiting prevents abuse
- Input validation on all endpoints
- Server-side rounding is authoritative

## Future Enhancements

- [ ] Redis-based rate limiting for production
- [ ] Cron job for auto-closing timesheets at 23:59
- [ ] Email notifications for missing clock-outs
- [ ] Export timesheet data to CSV/PDF
- [ ] Admin dashboard for timesheet approval
- [ ] Time tracking reports and analytics








