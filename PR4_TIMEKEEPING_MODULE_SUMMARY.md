# PR 4: Timekeeping/Employee Module + Approvals

## Summary

This PR creates a comprehensive timekeeping module with time-off requests, expense reports, service reports, and enhanced approval workflows. It includes a service layer for business logic and consistent API response formats.

## Changed Files

### New Files

#### Timekeeping Module Structure
- `lib/timekeeping/schemas.ts` - Zod schemas for validation
- `lib/timekeeping/service.ts` - Business logic layer (server-only)
- `lib/timekeeping/useTimekeeping.ts` - Client hooks for API calls
- `lib/timekeeping/timesheet-service.ts` - Timesheet approval service

#### API Endpoints
- `app/api/timekeeping/time-off/route.ts` - Time-off requests CRUD
- `app/api/timekeeping/time-off/[id]/route.ts` - Update time-off request status
- `app/api/timekeeping/expenses/route.ts` - Expense reports CRUD
- `app/api/timekeeping/expenses/[id]/route.ts` - Update expense report status
- `app/api/timekeeping/expenses/[id]/receipt/route.ts` - Upload receipt
- `app/api/timekeeping/service-reports/route.ts` - Service reports CRUD
- `app/api/timekeeping/service-reports/[id]/route.ts` - Update/delete service report

### Modified Files

- `prisma/schema.prisma` - Added `TimeOffRequest`, `ExpenseReport`, `ServiceReport` models
- `app/api/timesheet-submissions/[id]/route.ts` - Updated to use TimesheetService, consistent response format

### Database Migration

- `prisma/migrations/20250101000003_add_timekeeping_models/migration.sql` - Creates three new tables

## New Prisma Migration

**Migration Name:** `20250101000003_add_timekeeping_models`

**Changes:**
- Creates `time_off_requests` table with fields:
  - `id`, `userId`, `startDate`, `endDate`, `requestType`, `reason`, `hours`
  - `status` (PENDING, APPROVED, REJECTED, CANCELLED)
  - Approval/rejection tracking with timestamps and user IDs
- Creates `expense_reports` table with fields:
  - `id`, `userId`, `reportDate`, `description`, `amount`, `category`
  - `jobId` (optional), `receiptFileId` (FileRecord reference)
  - `status` (DRAFT, SUBMITTED, APPROVED, REJECTED, PAID)
  - Approval/rejection/payment tracking
- Creates `service_reports` table with fields:
  - `id`, `jobId`, `userId`, `reportDate`, `serviceType`, `description`
  - `hoursWorked`, `customerNotes`, `internalNotes`
  - Links to FileRecord for attachments
- Adds indexes for common queries
- Adds foreign key constraints

## Key Features

### 1. Time-Off Requests
- **Endpoints:** `GET/POST /api/timekeeping/time-off`, `PATCH /api/timekeeping/time-off/[id]`
- Create time-off requests (VACATION, SICK, PERSONAL, UNPAID, OTHER)
- Automatic hours calculation (8 hours/day if not provided)
- Status workflow: PENDING → APPROVED/REJECTED/CANCELLED
- Admin approval/rejection with reason tracking
- Filter by user, status, type, date range

### 2. Expense Reports
- **Endpoints:** `GET/POST /api/timekeeping/expenses`, `PATCH /api/timekeeping/expenses/[id]`, `POST /api/timekeeping/expenses/[id]/receipt`
- Create expense reports with categories (TRAVEL, MEALS, SUPPLIES, EQUIPMENT, OTHER)
- Link to jobs (optional)
- Receipt upload (images/PDFs, max 5MB)
- Status workflow: DRAFT → SUBMITTED → APPROVED → PAID / REJECTED
- Admin approval/rejection with reason
- Payment tracking

### 3. Service Reports
- **Endpoints:** `GET/POST /api/timekeeping/service-reports`, `PATCH/DELETE /api/timekeeping/service-reports/[id]`
- Create on-site service reports linked to jobs
- Service types: INSTALLATION, MAINTENANCE, REPAIR, COMMISSIONING, TRAINING, OTHER
- Customer and internal notes
- Hours worked tracking
- File attachments support
- View all reports for a job

### 4. Enhanced Timesheet Approvals
- **Service Layer:** `TimesheetService` for approval workflows
- Consistent approval/rejection/reopen logic
- Rejection reason required
- Proper status transitions
- Consistent API response format

### 5. Modular Structure
- Service layer for business logic
- Zod schemas for validation
- Client hooks for API calls
- Consistent error handling
- Storage adapter integration for receipts

## API Changes

### POST /api/timekeeping/time-off
**New Endpoint:** Create time-off request

**Request:**
```json
{
  "userId": "user-id",
  "startDate": "2025-01-15T00:00:00Z",
  "endDate": "2025-01-17T00:00:00Z",
  "requestType": "VACATION",
  "reason": "Family vacation",
  "hours": 24
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "PENDING",
    "user": { ... },
    ...
  }
}
```

### PATCH /api/timekeeping/time-off/[id]
**New Endpoint:** Approve/reject/cancel time-off request

**Request:**
```json
{
  "status": "APPROVED"
}
// or
{
  "status": "REJECTED",
  "rejectionReason": "Insufficient PTO balance"
}
```

### POST /api/timekeeping/expenses
**New Endpoint:** Create expense report

**Request:**
```json
{
  "userId": "user-id",
  "reportDate": "2025-01-10T00:00:00Z",
  "description": "Hotel stay",
  "amount": 150.00,
  "category": "TRAVEL",
  "jobId": "job-id"
}
```

### POST /api/timekeeping/expenses/[id]/receipt
**New Endpoint:** Upload receipt

**Request:** `multipart/form-data` with `file` field

**Response:**
```json
{
  "success": true,
  "data": {
    "fileRecordId": "..."
  }
}
```

### POST /api/timekeeping/service-reports
**New Endpoint:** Create service report

**Request:**
```json
{
  "jobId": "job-id",
  "userId": "user-id",
  "reportDate": "2025-01-10T00:00:00Z",
  "serviceType": "INSTALLATION",
  "description": "Installed control panel",
  "hoursWorked": 8,
  "customerNotes": "Customer satisfied",
  "internalNotes": "Panel needs calibration",
  "attachments": ["file-record-id-1", "file-record-id-2"]
}
```

### PUT /api/timesheet-submissions/[id]
**Updated Endpoint:** Now uses TimesheetService and consistent response format

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "APPROVED",
    "approvedBy": { ... },
    ...
  }
}
```

## Migration Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migration
```bash
# Generate Prisma client
npm run db:generate

# Apply migration
npx prisma migrate deploy
```

### 3. Test Time-Off Requests
```bash
# Create time-off request
curl -X POST http://localhost:3000/api/timekeeping/time-off \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "startDate": "2025-01-15T00:00:00Z",
    "endDate": "2025-01-17T00:00:00Z",
    "requestType": "VACATION"
  }'
```

### 4. Test Expense Reports
```bash
# Create expense report
curl -X POST http://localhost:3000/api/timekeeping/expenses \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "reportDate": "2025-01-10T00:00:00Z",
    "description": "Hotel stay",
    "amount": 150.00,
    "category": "TRAVEL"
  }'

# Upload receipt
curl -X POST http://localhost:3000/api/timekeeping/expenses/{id}/receipt \
  -H "Cookie: next-auth.session-token=..." \
  -F "file=@receipt.jpg"
```

## Breaking Changes

### API Response Format
- All timekeeping API endpoints now return `{ success: boolean, data?, error? }` format
- Timesheet submission approval endpoint updated to consistent format
- Frontend code using old format needs updating

## Testing Checklist

- [ ] Create time-off request → Request created with PENDING status
- [ ] Approve time-off request → Status changes to APPROVED
- [ ] Reject time-off request → Status changes to REJECTED with reason
- [ ] Create expense report → Report created with DRAFT status
- [ ] Upload receipt → Receipt uploaded and linked to expense
- [ ] Submit expense report → Status changes to SUBMITTED
- [ ] Approve expense report → Status changes to APPROVED
- [ ] Mark expense as paid → Status changes to PAID
- [ ] Create service report → Report created and linked to job
- [ ] View service reports for job → All reports returned
- [ ] Approve timesheet → Uses TimesheetService
- [ ] Reject timesheet → Requires rejection reason
- [ ] Reopen timesheet → Status changes to DRAFT

## Next Steps (Future PRs)

- Create employee dashboard UI with calendar
- Add presence status tracking
- Add task assignment UI
- Add scheduled site visits calendar
- Add PTO balance tracking
- Add expense report approval UI
- Add service report templates (RSA PM010-PM140)
- Add employee presence status API

## Notes

- Receipt uploads use storage adapter (local or S3)
- File size limit: 5MB for receipts
- Allowed file types: images (JPEG, PNG, GIF) and PDFs
- Time-off hours calculated automatically if not provided (8 hours/day)
- Expense reports can be linked to jobs for cost tracking
- Service reports support multiple file attachments
- Timesheet approval workflow now uses service layer
- All API responses follow consistent format

