# Fix: "Failed to load employees" Error

## Problem
The Employee Management page shows "Failed to load employees" error. This is because the database migration for the employee hierarchy hasn't been applied yet.

## Solution

You have two options to fix this:

### Option 1: Run Manual SQL Migration (Recommended if Prisma migrations are failing)

1. Connect to your PostgreSQL database
2. Run the SQL script:
   ```bash
   psql -d automation_firm_db -f scripts/manual-migration-employee-hierarchy.sql
   ```
   Or copy and paste the contents of `scripts/manual-migration-employee-hierarchy.sql` into your database client.

3. Regenerate Prisma client:
   ```bash
   npx prisma generate
   ```

4. Restart your development server:
   ```bash
   npm run dev
   ```

### Option 2: Fix Prisma Migrations (If you want to use Prisma migrations)

1. First, apply all pending migrations:
   ```bash
   npx prisma migrate deploy
   ```

2. Then create the new migration:
   ```bash
   npx prisma migrate dev --name add_employee_hierarchy_and_audit
   ```

3. Regenerate Prisma client:
   ```bash
   npx prisma generate
   ```

4. Restart your development server

## What the Migration Does

The migration adds:
- `managerId` field to `users` table for hierarchical structure
- `audit_logs` table for tracking all actions
- `quote_lost_reasons` table for tracking lost quotes
- Foreign key constraints and indexes
- Fixes for the EquipmentCalibration relation

## Verification

After running the migration, you should be able to:
1. Access `/dashboard/admin/employees` without errors
2. See the employee list (if any employees exist)
3. Add new employees with manager assignments
4. View the organizational hierarchy

## If Issues Persist

1. Check the browser console for detailed error messages
2. Check the server logs for API errors
3. Verify the database connection
4. Ensure you have ADMIN role to access the employee management page

