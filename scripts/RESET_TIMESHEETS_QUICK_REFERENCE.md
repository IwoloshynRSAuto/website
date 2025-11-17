# Reset Timesheet Submissions - Quick Reference

## Quick Start

### 1. Backup (Recommended)
```bash
# Full database backup
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Verify Current State
```bash
node scripts/verify-timesheet-status.js
```

### 3. Reset SUBMITTED/APPROVED to DRAFT
```bash
node scripts/reset-submitted-approved-timesheets.js
```

### 4. Verify Results
```bash
node scripts/verify-timesheet-status.js
```

---

## What Gets Reset

| Field | Before | After |
|-------|--------|-------|
| `status` | SUBMITTED/APPROVED | DRAFT |
| `submittedAt` | Date | NULL |
| `approvedAt` | Date | NULL |
| `approvedById` | User ID | NULL |
| `rejectedAt` | Date (if exists) | NULL |
| `rejectedById` | User ID (if exists) | NULL |
| `rejectionReason` | Text (if exists) | NULL |

---

## Verification Queries

### Check Status Counts
```sql
SELECT status, COUNT(*) as count 
FROM "timesheet_submissions"
GROUP BY status
ORDER BY status;
```

### Verify No SUBMITTED/APPROVED Remain
```sql
SELECT COUNT(*) as remaining 
FROM "timesheet_submissions"
WHERE status IN ('SUBMITTED', 'APPROVED');
-- Expected: 0
```

### Verify DRAFT Count Increased
```sql
SELECT COUNT(*) as draft_count 
FROM "timesheet_submissions"
WHERE status = 'DRAFT';
-- Should = original DRAFT + original SUBMITTED + original APPROVED
```

### Verify Fields Cleared
```sql
SELECT COUNT(*) as draft_with_data
FROM "timesheet_submissions"
WHERE status = 'DRAFT'
  AND ("submittedAt" IS NOT NULL 
       OR "approvedAt" IS NOT NULL 
       OR "approvedById" IS NOT NULL);
-- Expected: 0
```

### Verify No Data Deleted
```sql
SELECT COUNT(*) as total 
FROM "timesheet_submissions";
-- Should match pre-reset total
```

---

## Files

- **Reset Script (Node.js)**: `scripts/reset-submitted-approved-timesheets.js`
- **Reset Script (SQL)**: `scripts/reset-submitted-approved-timesheets.sql`
- **Verification Script**: `scripts/verify-timesheet-status.js`
- **Execution Plan**: `scripts/RESET_TIMESHEETS_EXECUTION_PLAN.md`
- **Quick Reference**: `scripts/RESET_TIMESHEETS_QUICK_REFERENCE.md` (this file)

---

## Rollback

If needed, restore from backup:
```bash
psql -U your_user -d your_database < backup_TIMESTAMP.sql
```

---

## Support

See `RESET_TIMESHEETS_EXECUTION_PLAN.md` for detailed instructions and troubleshooting.

