# Employee Management and Metrics System - Execution Guide

This guide provides step-by-step instructions for setting up and using the complete Employee Management and Metrics system.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Environment variables configured (DATABASE_URL, NEXTAUTH_SECRET, etc.)

## Step 1: Database Migration

Run the Prisma migration to add the new schema changes:

```bash
cd /opt/timekeeping-portal
npx prisma migrate dev --name add_employee_hierarchy_and_audit
npx prisma generate
```

This will:
- Add `managerId` field to User model
- Create `AuditLog` model
- Create `QuoteLostReason` model
- Update all necessary relations

## Step 2: Setup Test Data (Optional)

Create test employee hierarchy and sample requests:

```bash
node scripts/setup-test-employee-data.js
```

This creates:
- CEO (Admin)
- Engineering Manager
- Sales Manager
- Engineers and Technicians
- Sample PTO and expense requests

## Step 3: Start the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Step 4: Access the System

### Admin Access
- **Employee Management**: `/dashboard/admin/employees`
  - Add, edit, deactivate employees
  - Assign managers and roles
  - View organizational hierarchy

### Employee Access
- **My Requests**: `/dashboard/employee/requests`
  - Submit PTO requests
  - Submit expense reports
  - Request time changes
  - View request status

### Manager Access
- **Approvals Dashboard**: `/dashboard/manager/approvals`
  - View pending approvals from direct reports
  - Approve/reject PTO requests
  - Approve/reject expense reports
  - Approve/reject time change requests

### Metrics Dashboards
- **Employee Metrics**: `/dashboard/metrics/employee`
  - View hours logged, productivity, accuracy
  - Hours by discipline
  - Projects worked on
  - Quoted vs actual comparison

- **Job Metrics**: `/dashboard/metrics/job`
  - Job profitability
  - Cost variance
  - Schedule variance
  - Labor burn-down

- **Quote Metrics**: `/dashboard/metrics/quote`
  - Win/loss rates
  - Profit per job
  - Turnaround times
  - Lost quote reasons

## Step 5: Testing

Run the test script to verify all workflows:

```bash
node scripts/test-employee-workflows.js
```

This tests:
- Employee hierarchy structure
- Pending approvals
- Audit logs
- Metrics calculations

## API Endpoints

### Employee Management
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create employee
- `GET /api/employees/[id]` - Get employee details
- `PATCH /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Deactivate employee

### Approvals
- `GET /api/approvals` - Get pending approvals
- `PATCH /api/approvals/time-off/[id]` - Approve/reject PTO
- `PATCH /api/approvals/expense/[id]` - Approve/reject expense
- `PATCH /api/approvals/time-change/[id]` - Approve/reject time change

### Metrics
- `GET /api/metrics/employee` - Employee metrics
- `GET /api/metrics/job` - Job metrics
- `GET /api/metrics/quote` - Quote metrics

### Requests
- `GET /api/time-off-requests` - List PTO requests
- `POST /api/time-off-requests` - Create PTO request
- `GET /api/expense-reports` - List expense reports
- `POST /api/expense-reports` - Create expense report
- `PATCH /api/expense-reports/[id]` - Submit expense report

## Features

### Employee Management
- ✅ Hierarchical organization structure
- ✅ Manager assignment
- ✅ Role-based access control
- ✅ Employee activation/deactivation
- ✅ Complete audit trail

### Approval Workflows
- ✅ Manager approval for direct reports
- ✅ PTO request approval
- ✅ Expense report approval
- ✅ Time change request approval
- ✅ Rejection with reasons
- ✅ Email notifications (can be added)

### Metrics & Analytics
- ✅ Employee productivity metrics
- ✅ Hours by discipline
- ✅ Quoted vs actual accuracy
- ✅ Job profitability
- ✅ Schedule variance
- ✅ Quote win/loss rates
- ✅ Turnaround time analysis

## Troubleshooting

### Migration Issues
If migration fails, check:
- Database connection string
- Prisma schema syntax
- Existing data conflicts

### Permission Issues
Ensure:
- User roles are correctly assigned
- Manager relationships are set up
- Authorization checks are working

### Metrics Not Showing
Check:
- Time entries exist in database
- Date filters are correct
- User has analytics permissions

## Next Steps

1. **Add Email Notifications**: Configure email service for approval notifications
2. **Add Reporting**: Create PDF export for metrics
3. **Add Dashboards**: Create executive summary dashboards
4. **Add Integrations**: Connect with payroll/HR systems

## Support

For issues or questions, refer to:
- `docs/EMPLOYEE_SYSTEM_IMPLEMENTATION_STATUS.md` - Implementation status
- `docs/COMPLETE_EMPLOYEE_METRICS_IMPLEMENTATION.md` - Complete documentation
- Code comments in individual files

