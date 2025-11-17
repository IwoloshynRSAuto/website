# Deployment Checklist

This checklist guides you through deploying the refactored Timekeeping Portal application.

## Pre-Deployment

### 1. Code Review
- [ ] Review all 8 PR summaries
- [ ] Verify all tests pass locally
- [ ] Check for any breaking changes
- [ ] Review database migration files
- [ ] Verify environment variables are documented

### 2. Database Preparation
- [ ] Backup production database
- [ ] Review migration files in `prisma/migrations/`
- [ ] Test migrations on staging database
- [ ] Verify rollback scripts are available
- [ ] Plan migration window (if needed)

### 3. Environment Variables
- [ ] Verify all required env vars are set:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `MICROSOFT_CLIENT_ID`
  - `MICROSOFT_CLIENT_SECRET`
  - `MICROSOFT_TENANT_ID`
- [ ] Set storage configuration:
  - `STORAGE_ADAPTER` (local or s3)
  - If S3: `S3_ENDPOINT`, `S3_KEY`, `S3_SECRET`, `S3_BUCKET`
- [ ] Verify optional env vars if needed

### 4. Dependencies
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Verify no dependency conflicts
- [ ] Check for security vulnerabilities: `npm audit`

## Deployment Steps (In Order)

### Step 1: PR 1 - Storage Adapter + FileRecord Model
- [ ] Deploy code changes
- [ ] Run database migration: `npx prisma migrate deploy`
- [ ] Run backfill script: `node scripts/backfill-file-records.js`
- [ ] Verify FileRecord entries created
- [ ] Test storage adapter: `GET /api/storage/test`
- [ ] Verify existing file access still works

**Rollback Plan:**
- Revert code changes
- Rollback migration if needed

### Step 2: PR 2 - Quotes Module
- [ ] Deploy code changes
- [ ] Verify QuoteRevision model migration applied
- [ ] Test quote CRUD operations
- [ ] Test PDF export functionality
- [ ] Verify existing quotes still accessible
- [ ] Test quote file uploads

**Rollback Plan:**
- Revert code changes
- Existing quotes remain in database

### Step 3: PR 3 - Jobs Module
- [ ] Deploy code changes
- [ ] Run JobMilestone migration
- [ ] Test quote-to-job conversion
- [ ] Verify existing jobs still accessible
- [ ] Test job milestone tracking
- [ ] Test ECO creation

**Rollback Plan:**
- Revert code changes
- Existing jobs remain in database

### Step 4: PR 4 - Timekeeping Module
- [ ] Deploy code changes
- [ ] Run timekeeping model migrations
- [ ] Test time-off request creation
- [ ] Test expense report submission
- [ ] Test service report creation
- [ ] Verify timesheet approval workflow
- [ ] Test receipt uploads

**Rollback Plan:**
- Revert code changes
- Existing time entries remain in database

### Step 5: PR 5 - Vendors, Part Sales, Customers
- [ ] Deploy code changes
- [ ] Run vendor and purchase order migrations
- [ ] Run quoteType migration
- [ ] Test vendor CRUD operations
- [ ] Test part sales creation
- [ ] Verify customer metrics work
- [ ] Test purchase order creation

**Rollback Plan:**
- Revert code changes
- Existing data remains in database

### Step 6: PR 6 - Analytics Module
- [ ] Deploy code changes
- [ ] No database migrations required
- [ ] Test analytics endpoints:
  - `/api/analytics/hours`
  - `/api/analytics/quoted-vs-actual`
  - `/api/analytics/profitability`
  - `/api/analytics/win-loss`
  - `/api/analytics/dashboard`
- [ ] Verify metrics calculations are correct
- [ ] Test with real data

**Rollback Plan:**
- Revert code changes
- No data changes to rollback

### Step 7: PR 7 - Roles & Permissions
- [ ] Deploy code changes
- [ ] No database migrations required
- [ ] Verify authorization works:
  - Test admin access
  - Test manager access
  - Test technician access
  - Test sales access
- [ ] Verify existing role checks still work
- [ ] Test shared UI components render correctly
- [ ] Verify form standardization works

**Rollback Plan:**
- Revert code changes
- Old role checks will still work

### Step 8: PR 8 - Tests + CI
- [ ] Deploy code changes
- [ ] Verify CI workflow runs successfully
- [ ] Check test coverage reports
- [ ] Verify E2E tests pass
- [ ] Review test results

**Rollback Plan:**
- Revert code changes
- No functional impact

## Post-Deployment

### 1. Verification
- [ ] All API endpoints respond correctly
- [ ] Authentication works
- [ ] File uploads/downloads work
- [ ] PDF exports work
- [ ] Analytics endpoints return data
- [ ] Authorization checks work
- [ ] UI components render correctly

### 2. Data Verification
- [ ] FileRecord entries exist for existing files
- [ ] Quotes are accessible
- [ ] Jobs are accessible
- [ ] Time entries are accessible
- [ ] User roles are correct

### 3. Performance
- [ ] Page load times acceptable
- [ ] API response times acceptable
- [ ] Database queries optimized
- [ ] No memory leaks

### 4. Monitoring
- [ ] Set up error monitoring
- [ ] Monitor API response times
- [ ] Watch for database connection issues
- [ ] Monitor storage adapter health

### 5. User Acceptance Testing
- [ ] Test quote creation flow
- [ ] Test quote-to-job conversion
- [ ] Test timesheet submission
- [ ] Test expense report submission
- [ ] Test analytics dashboard
- [ ] Test file uploads
- [ ] Test PDF exports

## Optional: Storage Migration to S3

If migrating from local to S3 storage:

1. **Pre-Migration**
   - [ ] Verify S3 credentials are correct
   - [ ] Test S3 connection: `GET /api/storage/test`
   - [ ] Verify S3 bucket exists and is accessible
   - [ ] Backup local storage files

2. **Migration**
   - [ ] Set `STORAGE_ADAPTER=s3` in environment
   - [ ] Run dry-run: `node scripts/storage-migrate.js --dry-run`
   - [ ] Review dry-run results
   - [ ] Run migration: `node scripts/storage-migrate.js`
   - [ ] Verify files uploaded to S3
   - [ ] Verify FileRecord entries updated

3. **Post-Migration**
   - [ ] Test file downloads
   - [ ] Verify signed URLs work
   - [ ] Keep local files as backup for 30 days
   - [ ] Monitor S3 usage and costs

## Rollback Procedures

### Full Rollback
1. Revert code changes
2. Rollback database migrations if needed
3. Restore from backup if data was affected
4. Verify application works

### Partial Rollback
1. Revert specific PR code changes
2. Rollback specific migrations if needed
3. Verify affected features work

## Support Contacts

- **Database Issues**: Review migration files and Prisma docs
- **Storage Issues**: Check storage adapter configuration
- **Authorization Issues**: Review `lib/auth/authorization.ts`
- **API Issues**: Check API endpoint implementations
- **Testing Issues**: Review `TESTING.md`

## Emergency Contacts

- Review error logs
- Check CI/CD pipeline status
- Review database connection
- Check environment variables
- Review application logs

## Success Criteria

- [ ] All PRs deployed successfully
- [ ] All tests pass
- [ ] No data loss
- [ ] All features work as expected
- [ ] Performance is acceptable
- [ ] Users can access all features
- [ ] Analytics are accurate
- [ ] Authorization works correctly

## Notes

- Deploy during low-traffic periods if possible
- Have rollback plan ready
- Monitor closely after deployment
- Keep backups for at least 30 days
- Document any issues encountered
- Update this checklist with lessons learned

