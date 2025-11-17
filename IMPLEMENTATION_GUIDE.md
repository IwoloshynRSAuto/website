# Implementation Guide

Practical guide for implementing and using the new modular features.

## Quick Verification

Run these commands to verify everything is set up:

```bash
# Check modules exist
ls -la lib/quotes lib/jobs lib/timekeeping lib/vendors lib/analytics lib/auth

# Check API routes exist
ls -la app/api/quotes app/api/jobs app/api/analytics

# Check tests exist
ls -la lib/*/__tests__ tests/api e2e

# Run tests
npm test
```

## Using the New Modules

### 1. Quotes Module

#### Server-Side (API Routes)
```typescript
import { QuoteService } from '@/lib/quotes/service'

// Get quotes
const quotes = await QuoteService.getQuotes({ status: 'DRAFT' })

// Create quote
const quote = await QuoteService.createQuote({
  customerId: 'cust1',
  amount: 10000,
  status: 'DRAFT',
})

// Export PDF
const pdfFile = await QuoteService.exportPDF(quoteId)
```

#### Client-Side (React Components)
```typescript
'use client'
import { useQuotes } from '@/lib/quotes/useQuotes'

export function QuotesList() {
  const { quotes, loading, error, createQuote } = useQuotes()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {quotes.map(quote => (
        <div key={quote.id}>{quote.quoteNumber}</div>
      ))}
    </div>
  )
}
```

### 2. Jobs Module

#### Server-Side
```typescript
import { JobService } from '@/lib/jobs/service'

// Get jobs
const jobs = await JobService.getJobs({ status: 'ACTIVE' })

// Convert quote to job
const job = await JobService.convertQuoteToJob(quoteId, {
  estimatedCost: 10000,
  startDate: new Date(),
})

// Get job costs
const costs = await JobService.getJobCosts(jobId)
```

#### Client-Side
```typescript
import { useJobs } from '@/lib/jobs/useJobs'

const { jobs, loading, convertQuoteToJob } = useJobs()
```

### 3. Timekeeping Module

#### Server-Side
```typescript
import { TimekeepingService } from '@/lib/timekeeping/service'

// Create time-off request
const request = await TimekeepingService.createTimeOffRequest({
  userId: 'user1',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-05'),
  type: 'VACATION',
  reason: 'Family vacation',
})

// Create expense report
const expense = await TimekeepingService.createExpenseReport({
  userId: 'user1',
  jobId: 'job1',
  amount: 100.50,
  description: 'Travel expenses',
  date: new Date(),
})
```

#### Client-Side
```typescript
import { useTimekeeping } from '@/lib/timekeeping/useTimekeeping'

const { 
  timeOffRequests, 
  expenseReports,
  createTimeOffRequest,
  createExpenseReport 
} = useTimekeeping()
```

### 4. Analytics Module

#### Server-Side
```typescript
import { AnalyticsService } from '@/lib/analytics/service'

// Get hours logged
const hours = await AnalyticsService.getHoursLogged({
  year: 2025,
  userId: 'user1',
})

// Get quoted vs actual
const comparison = await AnalyticsService.getQuotedVsActual({
  year: 2025,
})

// Get dashboard metrics
const dashboard = await AnalyticsService.getDashboardMetrics({
  year: 2025,
})
```

#### Client-Side (API Call)
```typescript
const response = await fetch('/api/analytics/dashboard?year=2025')
const { data } = await response.json()
// data.hoursLogged, data.quotedVsActual, etc.
```

### 5. Authorization

#### In API Routes
```typescript
import { authorize, authorizeOwnResource } from '@/lib/auth/authorization'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!authorize(session.user, 'read', 'user')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    )
  }
  
  // ... rest of handler
}
```

#### Check Own Resource
```typescript
if (!authorizeOwnResource(session.user, 'update', 'timesheet', timesheet.userId)) {
  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: 403 }
  )
}
```

### 6. Shared UI Components

#### Card Component
```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Quote Details</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### Paginated Table
```typescript
import { PaginatedTable } from '@/components/ui/paginated-table'

<PaginatedTable
  data={quotes}
  columns={[
    { key: 'quoteNumber', header: 'Quote #', render: (q) => q.quoteNumber },
    { key: 'amount', header: 'Amount', render: (q) => `$${q.amount}` },
  ]}
  pageSize={10}
/>
```

#### Confirm Dialog
```typescript
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Delete Quote?"
  description="This action cannot be undone."
  onConfirm={handleDelete}
  variant="destructive"
/>
```

#### Search Input
```typescript
import { SearchInput } from '@/components/ui/search-input'

<SearchInput
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="Search quotes..."
/>
```

### 7. Form Standardization

```typescript
import { useFormWithValidation } from '@/lib/forms/useFormWithValidation'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

function MyForm() {
  const form = useFormWithValidation({
    schema,
    onSubmit: async (data) => {
      await fetch('/api/endpoint', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    successMessage: 'Form submitted successfully',
  })

  return (
    <form onSubmit={form.handleSubmit}>
      <input {...form.register('name')} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
      <button type="submit" disabled={form.isSubmitting}>
        Submit
      </button>
    </form>
  )
}
```

## API Usage Examples

### Create Quote
```bash
curl -X POST http://localhost:3000/api/quotes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "customerId": "cust1",
    "amount": 10000,
    "status": "DRAFT"
  }'
```

### Get Analytics
```bash
curl http://localhost:3000/api/analytics/dashboard?year=2025 \
  -H "Cookie: next-auth.session-token=..."
```

### Convert Quote to Job
```bash
curl -X POST http://localhost:3000/api/jobs/convert \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "quoteId": "quote1",
    "estimatedCost": 10000,
    "startDate": "2025-01-01"
  }'
```

## Database Queries

### Using Prisma with New Models

```typescript
import { prisma } from '@/lib/prisma'

// Get quote with revisions
const quote = await prisma.quote.findUnique({
  where: { id: 'quote1' },
  include: {
    revisions: true,
    files: true,
    customer: true,
  },
})

// Get job with milestones
const job = await prisma.job.findUnique({
  where: { id: 'job1' },
  include: {
    milestones: true,
    timeEntries: true,
    expenseReports: true,
  },
})

// Get vendor with price history
const vendor = await prisma.vendor.findUnique({
  where: { id: 'vendor1' },
  include: {
    partPrices: {
      orderBy: { effectiveDate: 'desc' },
    },
  },
})
```

## Migration Examples

### Backfill File Records
```bash
# Dry run first
node scripts/backfill-file-records.js --dry-run

# Apply changes
node scripts/backfill-file-records.js
```

### Migrate Storage to S3
```bash
# Set S3 environment variables
export STORAGE_ADAPTER=s3
export S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
export S3_KEY=your-key
export S3_SECRET=your-secret
export S3_BUCKET=your-bucket

# Dry run
node scripts/storage-migrate.js --dry-run

# Apply migration
node scripts/storage-migrate.js
```

## Testing Examples

### Unit Test
```typescript
import { AnalyticsService } from '../service'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma')

describe('AnalyticsService', () => {
  it('should calculate hours correctly', async () => {
    const mockEntries = [
      { regularHours: 8, overtimeHours: 2 },
      { regularHours: 7, overtimeHours: 1 },
    ]
    ;(prisma.timeEntry.findMany as jest.Mock).mockResolvedValue(mockEntries)

    const result = await AnalyticsService.getHoursLogged({})
    expect(result.totalHours).toBe(18)
  })
})
```

### API Test
```typescript
import { GET } from '@/app/api/quotes/route'
import { NextRequest } from 'next/server'

describe('Quotes API', () => {
  it('should return quotes', async () => {
    const request = new NextRequest('http://localhost:3000/api/quotes')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

## Common Patterns

### Error Handling
```typescript
try {
  const result = await Service.method()
  return NextResponse.json({ success: true, data: result })
} catch (error: any) {
  console.error('Error:', error)
  return NextResponse.json(
    { success: false, error: error.message || 'Operation failed' },
    { status: 500 }
  )
}
```

### Validation
```typescript
import { schema } from '@/lib/module/schemas'

const body = await request.json()
const validatedData = schema.parse(body)
```

### Authorization Check
```typescript
const session = await getServerSession(authOptions)
if (!session) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  )
}

if (!authorize(session.user, 'create', 'resource')) {
  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: 403 }
  )
}
```

## Next Steps

1. **Review Module Code**
   - Check `lib/{module}/service.ts` for business logic
   - Review `lib/{module}/schemas.ts` for validation
   - Look at `lib/{module}/use{Module}.ts` for client hooks

2. **Review API Routes**
   - Check `app/api/{module}/route.ts` for endpoints
   - Review request/response handling
   - Check authorization

3. **Test Locally**
   - Run `npm test` for unit tests
   - Run `npm run test:e2e` for E2E tests
   - Test API endpoints manually

4. **Integrate into UI**
   - Use client hooks in components
   - Use shared UI components
   - Follow form standardization patterns

5. **Deploy**
   - Follow `DEPLOYMENT_CHECKLIST.md`
   - Run migrations
   - Verify functionality

## Troubleshooting

### Module Not Found
- Check import paths use `@/` alias
- Verify module exists in `lib/`
- Check `tsconfig.json` paths

### Authorization Errors
- Verify user role in database
- Check capability map in `lib/auth/authorization.ts`
- Verify session is valid

### API Errors
- Check API route exists
- Verify request format matches schema
- Check authorization requirements
- Review error logs

### Database Errors
- Verify migrations are applied
- Check `DATABASE_URL` is correct
- Review Prisma schema
- Check model relations

## Resources

- [Complete Summary](./REFACTORING_COMPLETE_SUMMARY.md)
- [Testing Guide](./TESTING.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Documentation Index](./DOCUMENTATION_INDEX.md)

