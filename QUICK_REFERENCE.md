# Quick Reference

Quick reference guide for the Timekeeping Portal refactoring.

## Module Structure

```
lib/{module}/
  service.ts      # Business logic (server-only)
  schemas.ts      # Zod validation schemas
  use{Module}.ts  # Client-side React hooks

app/api/{module}/
  route.ts        # API endpoints
  [id]/route.ts   # Resource-specific endpoints
```

## Service Layer Pattern

```typescript
// Server-side
import { ModuleService } from '@/lib/{module}/service'
const result = await ModuleService.method(params)

// Client-side
import { useModule } from '@/lib/{module}/useModule'
const { data, loading, error, method } = useModule()
```

## API Response Format

```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "Error message" }
```

## Authorization

```typescript
import { authorize, authorizeOwnResource } from '@/lib/auth/authorization'

// Check capability
if (!authorize(user, 'read', 'resource')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Check own resource
if (!authorizeOwnResource(user, 'update', 'resource', resourceUserId)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

## Roles & Capabilities

| Role | Key Capabilities |
|------|------------------|
| ADMIN | Full access, manage users/roles |
| PROJECT_MANAGER | Approve timesheets, manage projects |
| ENGINEER | Create quotes/jobs, submit timesheets |
| TECHNICIAN | Submit own timesheets, create reports |
| SALES | Manage quotes, customers, vendors |
| ACCOUNTING | Approve expenses, manage POs |
| CLIENT_PORTAL | Read-only own resources |

## Common API Endpoints

### Quotes
- `GET /api/quotes` - List
- `POST /api/quotes` - Create
- `GET /api/quotes/[id]` - Get
- `POST /api/quotes/[id]/export` - PDF export

### Jobs
- `GET /api/jobs` - List
- `POST /api/jobs` - Create
- `POST /api/jobs/convert` - Convert quote
- `GET /api/jobs/[id]/costs` - Get costs

### Analytics
- `GET /api/analytics/dashboard` - All metrics
- `GET /api/analytics/hours` - Hours logged
- `GET /api/analytics/profitability` - Profitability

### Timekeeping
- `GET /api/timekeeping/time-off` - List requests
- `POST /api/timekeeping/time-off` - Create request
- `GET /api/timekeeping/expenses` - List expenses
- `POST /api/timekeeping/expenses` - Create expense

## Shared Components

```typescript
// Card
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// Table
import { Table, TableHeader, TableBody, TableRow } from '@/components/ui/table'

// Paginated Table
import { PaginatedTable } from '@/components/ui/paginated-table'

// Confirm Dialog
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// Search Input
import { SearchInput } from '@/components/ui/search-input'

// File Uploader
import { FileUploader } from '@/components/ui/file-uploader'
```

## Form Standardization

```typescript
import { useFormWithValidation } from '@/lib/forms/useFormWithValidation'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

const form = useFormWithValidation({
  schema,
  onSubmit: async (data) => {
    await api.create(data)
  },
})
```

## Storage

```typescript
import { getStorage } from '@/lib/storage'

const storage = getStorage()
await storage.upload('path/file.pdf', buffer)
const url = await storage.getSignedUrl('path/file.pdf')
```

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## Database

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

## Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=...
```

### Storage (Optional)
```env
STORAGE_ADAPTER=local  # or s3
STORAGE_BASE_PATH=./storage
S3_ENDPOINT=...
S3_KEY=...
S3_SECRET=...
S3_BUCKET=...
```

## Common Patterns

### API Route Pattern
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (!authorize(session.user, 'read', 'resource')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const data = await Service.get()
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Client Hook Pattern
```typescript
export function useModule() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const fetch = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/module')
      const json = await res.json()
      if (json.success) setData(json.data)
      else setError(json.error)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return { data, loading, error, fetch }
}
```

## File Organization

```
lib/
  {module}/
    service.ts      # Business logic
    schemas.ts      # Validation
    use{Module}.ts  # Client hooks

app/api/
  {module}/
    route.ts        # Endpoints

components/
  ui/               # Shared components
  {module}/         # Module components
```

## Key Files

- `lib/auth/authorization.ts` - Authorization
- `lib/storage/index.ts` - Storage abstraction
- `lib/forms/useFormWithValidation.ts` - Form hook
- `components/ui/` - Shared components
- `jest.config.js` - Test config
- `playwright.config.ts` - E2E config

## Documentation Links

- [Complete Summary](./REFACTORING_COMPLETE_SUMMARY.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Testing Guide](./TESTING.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

