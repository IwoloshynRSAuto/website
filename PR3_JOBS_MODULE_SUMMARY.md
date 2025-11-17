# PR 3: Jobs Module + Quote-to-Job Conversion

## Summary

This PR creates a modular jobs structure with service layer, implements quote-to-job conversion flow, adds job milestones for project tracking, and enhances job cost tracking with labor vs estimates comparison.

## Changed Files

### New Files

#### Jobs Module Structure
- `lib/jobs/schemas.ts` - Zod schemas for job validation
- `lib/jobs/service.ts` - Business logic layer (server-only)
- `lib/jobs/useJobs.ts` - Client hooks for API calls

#### API Endpoints
- `app/api/jobs/convert/route.ts` - Quote-to-job conversion endpoint
- `app/api/jobs/[id]/costs/route.ts` - Job cost calculation endpoint
- `app/api/jobs/[id]/milestones/route.ts` - Job milestones CRUD
- `app/api/jobs/[id]/milestones/[milestoneId]/route.ts` - Individual milestone operations

### Modified Files

- `prisma/schema.prisma` - Added `JobMilestone` model
- `app/api/jobs/route.ts` - Updated to use JobService, added filters, consistent response format
- `package.json` - No new dependencies (uses existing packages)

### Database Migration

- `prisma/migrations/20250101000002_add_job_milestone_model/migration.sql` - Creates `job_milestones` table

## New Prisma Migration

**Migration Name:** `20250101000002_add_job_milestone_model`

**Changes:**
- Creates `job_milestones` table with fields:
  - `id` (String, primary key)
  - `jobId` (String) - Foreign key to Job
  - `name` (String) - Milestone name
  - `description` (String, nullable)
  - `milestoneType` (String) - ENGINEERING, PANEL_BUILD, FAT, SAT, COMMISSIONING, OTHER
  - `scheduledStartDate`, `scheduledEndDate` (DateTime, nullable)
  - `actualStartDate`, `actualEndDate` (DateTime, nullable)
  - `status` (String) - NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED
  - `billingPercentage` (Float, nullable) - Percentage of job value
  - `isBillingTrigger` (Boolean) - Triggers invoice when completed
  - `createdAt`, `updatedAt` (DateTime)
- Creates indexes on `jobId`, `status`, `milestoneType`
- Adds foreign key constraint with cascade delete

## Key Features

### 1. Quote-to-Job Conversion
- **Endpoint:** `POST /api/jobs/convert`
- Converts a WON/SENT quote to an active job
- Copies quote data (title, description, customer, BOM, estimated hours/cost)
- Copies file records from quote to job
- Generates unique job number
- Sets `convertedAt` timestamp
- Updates quote status to WON

### 2. Job Milestones
- Track project phases: Engineering → Panel Build → FAT → SAT → Commissioning
- Scheduled vs actual dates
- Status tracking (NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED)
- Billing percentage per milestone
- Billing trigger flag for invoicing automation

### 3. Job Cost Tracking
- **Endpoint:** `GET /api/jobs/[id]/costs`
- Calculates actual vs estimated hours
- Calculates actual vs estimated labor costs
- Provides variance calculations (absolute and percentage)
- Updates job's `actualHours` field

### 4. Modular Structure
- Service layer for business logic
- Zod schemas for validation
- Client hooks for API calls
- Consistent error handling

### 5. Enhanced API
- Consistent response format: `{ success: boolean, data?, error? }`
- Filter support: status, type, assignedTo, customer, search, priority, dates
- Milestone data included in job responses
- Cost calculation endpoint

## API Changes

### POST /api/jobs/convert
**New Endpoint:** Convert quote to job

**Request:**
```json
{
  "quoteId": "quote-id",
  "assignedToId": "user-id",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-06-01T00:00:00Z",
  "workCode": "WC001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "jobNumber": "E1001",
    "title": "...",
    "convertedAt": "...",
    ...
  }
}
```

### GET /api/jobs/[id]/costs
**New Endpoint:** Calculate job costs

**Response:**
```json
{
  "success": true,
  "data": {
    "estimatedHours": 100,
    "actualHours": 120,
    "hoursVariance": 20,
    "hoursVariancePercent": 20,
    "estimatedLaborCost": 10000,
    "laborCost": 12000,
    "laborCostVariance": 2000,
    "laborCostVariancePercent": 20
  }
}
```

### GET /api/jobs/[id]/milestones
**New Endpoint:** Get job milestones

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Engineering",
      "milestoneType": "ENGINEERING",
      "status": "IN_PROGRESS",
      "scheduledStartDate": "...",
      "scheduledEndDate": "...",
      ...
    }
  ]
}
```

### POST /api/jobs/[id]/milestones
**New Endpoint:** Create milestone

**Request:**
```json
{
  "name": "Engineering",
  "milestoneType": "ENGINEERING",
  "scheduledStartDate": "2025-01-01T00:00:00Z",
  "scheduledEndDate": "2025-02-01T00:00:00Z",
  "billingPercentage": 30,
  "isBillingTrigger": true
}
```

### PATCH /api/jobs/[id]/milestones/[milestoneId]
**New Endpoint:** Update milestone

### DELETE /api/jobs/[id]/milestones/[milestoneId]
**New Endpoint:** Delete milestone

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

### 3. Test Quote-to-Job Conversion
```bash
# Start development server
npm run dev

# Test conversion
curl -X POST http://localhost:3000/api/jobs/convert \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "quoteId": "quote-id",
    "assignedToId": "user-id"
  }'
```

## Breaking Changes

### API Response Format
- All job API endpoints now return `{ success: boolean, data?, error? }` format
- Frontend code using old format needs updating

### Job Creation
- Old: Direct Prisma calls in route handler
- New: Uses JobService layer
- Response format changed to consistent structure

## Testing Checklist

- [ ] Create job → Uses JobService
- [ ] Convert quote to job → Copies all data correctly
- [ ] Create milestone → Milestone created
- [ ] Update milestone → Status updates work
- [ ] Calculate job costs → Returns accurate calculations
- [ ] Filter jobs → All filters work correctly
- [ ] Search jobs → Search works correctly
- [ ] Job with milestones → Milestones included in response
- [ ] Delete milestone → Milestone deleted
- [ ] Quote conversion copies files → FileRecords created for job

## Next Steps (Future PRs)

- Integrate quote-to-job conversion UI
- Add milestone Gantt/timeline view
- Add job detail page with milestones
- Add billing trigger automation
- Add Change Order (ECO) approval workflow UI
- Add job profitability dashboard

## Notes

- Quote-to-job conversion copies file records (creates new FileRecord entries)
- Job milestones support billing percentage tracking
- Cost calculation updates job's actualHours field
- All API responses follow consistent format
- JobService handles all business logic
- Existing EngineeringChangeOrder model remains (can be enhanced in future PR)

