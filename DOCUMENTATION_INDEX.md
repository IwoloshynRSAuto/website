# Documentation Index

Complete guide to all documentation for the Timekeeping Portal refactoring.

## Overview Documents

### [START_HERE.md](./START_HERE.md) ⭐
**Start here!** Quick overview and navigation guide for the complete refactoring.

### [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
Quick reference guide with common patterns, commands, and code snippets.

### [REFACTORING_COMPLETE_SUMMARY.md](./REFACTORING_COMPLETE_SUMMARY.md)
Complete overview of all 8 PRs, architecture, database changes, and implementation details.

### [QUICK_START.md](./QUICK_START.md)
Quick reference guide to get started with the application.

### [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
Step-by-step deployment checklist for all 8 PRs with rollback procedures.

## PR Summaries

### [PR1_STORAGE_ADAPTER_SUMMARY.md](./PR1_STORAGE_ADAPTER_SUMMARY.md)
**Storage Adapter + FileRecord Model**
- Storage abstraction layer (local/S3)
- FileRecord Prisma model
- Backfill and migration scripts

### [PR2_QUOTES_MODULE_SUMMARY.md](./PR2_QUOTES_MODULE_SUMMARY.md)
**Quotes Module**
- Modular quotes structure
- QuoteRevision model
- PDF export functionality
- CRUD operations

### [PR3_JOBS_MODULE_SUMMARY.md](./PR3_JOBS_MODULE_SUMMARY.md)
**Jobs Module + Quote-to-Job Conversion**
- Jobs module with service layer
- JobMilestone tracking
- Quote-to-job conversion
- ECO support

### [PR4_TIMEKEEPING_MODULE_SUMMARY.md](./PR4_TIMEKEEPING_MODULE_SUMMARY.md)
**Timekeeping/Employee Module + Approvals**
- Timekeeping module
- TimeOffRequest, ExpenseReport, ServiceReport models
- Timesheet approval workflows
- Receipt uploads

### [PR5_VENDORS_CUSTOMERS_PARTSALES_SUMMARY.md](./PR5_VENDORS_CUSTOMERS_PARTSALES_SUMMARY.md)
**Vendors, Part Sales, Customers**
- Vendors module with price history
- Part Sales module
- Enhanced Customers module with metrics
- Purchase Order tracking

### [PR6_ANALYTICS_MODULE_SUMMARY.md](./PR6_ANALYTICS_MODULE_SUMMARY.md)
**Analytics and Dashboards**
- Comprehensive analytics module
- Hours logged, quoted vs actual, profitability metrics
- Win/loss rates, BOM variance, productivity
- Dashboard endpoint

### [PR7_ROLES_PERMISSIONS_UI_STANDARDIZATION_SUMMARY.md](./PR7_ROLES_PERMISSIONS_UI_STANDARDIZATION_SUMMARY.md)
**Roles & Permissions + UI Standardization**
- Centralized authorization module
- Capability-based access control
- Shared UI components
- Form standardization

### [PR8_TESTS_CI_DOCS_SUMMARY.md](./PR8_TESTS_CI_DOCS_SUMMARY.md)
**Tests + CI + Docs**
- Jest testing infrastructure
- Playwright E2E tests
- CI/CD workflow
- Testing documentation

## Technical Documentation

### [TESTING.md](./TESTING.md)
Comprehensive testing guide covering:
- Unit tests
- Integration tests
- E2E tests
- CI/CD integration
- Best practices

### [README.md](./README.md)
Main project documentation with:
- Getting started guide
- Tech stack
- Environment variables
- Storage configuration
- Database migrations

## Module Documentation

### Quotes Module
- Service: `lib/quotes/service.ts`
- Schemas: `lib/quotes/schemas.ts`
- Hooks: `lib/quotes/useQuotes.ts`
- API: `app/api/quotes/`

### Jobs Module
- Service: `lib/jobs/service.ts`
- Schemas: `lib/jobs/schemas.ts`
- Hooks: `lib/jobs/useJobs.ts`
- API: `app/api/jobs/`

### Timekeeping Module
- Service: `lib/timekeeping/service.ts`
- Schemas: `lib/timekeeping/schemas.ts`
- Hooks: `lib/timekeeping/useTimekeeping.ts`
- API: `app/api/timekeeping/`

### Vendors Module
- Service: `lib/vendors/service.ts`
- Schemas: `lib/vendors/schemas.ts`
- Hooks: `lib/vendors/useVendors.ts`
- API: `app/api/vendors/`

### Analytics Module
- Service: `lib/analytics/service.ts`
- Schemas: `lib/analytics/schemas.ts`
- API: `app/api/analytics/`

### Authorization Module
- Authorization: `lib/auth/authorization.ts`
- Auth config: `lib/auth.ts`

## Code Examples

### Using Authorization
```typescript
import { authorize } from '@/lib/auth/authorization'

if (!authorize(session.user, 'read', 'user')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Using Service Layer
```typescript
import { QuoteService } from '@/lib/quotes/service'

const quotes = await QuoteService.getQuotes({ status: 'DRAFT' })
```

### Using Client Hooks
```typescript
import { useQuotes } from '@/lib/quotes/useQuotes'

const { quotes, loading, error, createQuote } = useQuotes()
```

### Using Shared Components
```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PaginatedTable } from '@/components/ui/paginated-table'
```

## API Reference

### Quotes API
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote
- `GET /api/quotes/[id]` - Get quote
- `PUT /api/quotes/[id]` - Update quote
- `DELETE /api/quotes/[id]` - Delete quote
- `POST /api/quotes/[id]/export` - Export PDF

### Jobs API
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job
- `POST /api/jobs/convert` - Convert quote to job
- `GET /api/jobs/[id]` - Get job
- `GET /api/jobs/[id]/costs` - Get job costs
- `GET /api/jobs/[id]/milestones` - Get milestones

### Analytics API
- `GET /api/analytics/dashboard` - All metrics
- `GET /api/analytics/hours` - Hours logged
- `GET /api/analytics/quoted-vs-actual` - Quoted vs actual
- `GET /api/analytics/profitability` - Profitability
- `GET /api/analytics/win-loss` - Win/loss rates
- `GET /api/analytics/bom-variance` - BOM variance
- `GET /api/analytics/productivity` - Productivity

## Database Schema

### Key Models
- `FileRecord` - File metadata
- `Quote` - Quotes with revisions
- `QuoteRevision` - Quote version control
- `Job` - Jobs with milestones
- `JobMilestone` - Job milestone tracking
- `TimeOffRequest` - Time-off requests
- `ExpenseReport` - Expense reports
- `ServiceReport` - Service reports
- `Vendor` - Vendors
- `VendorPartPrice` - Vendor price history
- `PurchaseOrder` - Purchase orders

See `prisma/schema.prisma` for complete schema.

## Migration Guide

### Running Migrations
```bash
npm run db:migrate
```

### Backfilling Data
```bash
node scripts/backfill-file-records.js
```

### Storage Migration
```bash
node scripts/storage-migrate.js
```

## Testing

### Running Tests
```bash
npm test              # Unit tests
npm run test:coverage # With coverage
npm run test:e2e      # E2E tests
```

### Test Structure
- Unit tests: `lib/**/__tests__/`
- Integration tests: `tests/api/`
- E2E tests: `e2e/`

See [TESTING.md](./TESTING.md) for details.

## Deployment

### Pre-Deployment
1. Review all PR summaries
2. Run tests locally
3. Backup database
4. Review migrations

### Deployment Steps
Follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for step-by-step deployment.

### Post-Deployment
1. Verify all endpoints
2. Check data integrity
3. Monitor performance
4. Run user acceptance tests

## Troubleshooting

### Common Issues
- **Database connection**: Check `DATABASE_URL`
- **Authentication**: Verify Azure AD credentials
- **Storage**: Test storage adapter endpoint
- **Tests failing**: Check environment variables

### Getting Help
1. Check relevant PR summary
2. Review test files for examples
3. Check API endpoint implementations
4. Review CI logs

## Additional Resources

### [FILE_INVENTORY.md](./FILE_INVENTORY.md)
Complete list of all files created and modified during the refactoring.

### [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md)
Comprehensive checklist to verify everything is in place before deployment.

### [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
Common issues and solutions for troubleshooting the application.

### [UI_STANDARDIZATION.md](./UI_STANDARDIZATION.md)
Complete guide to UI components, patterns, and standardization practices.

## Quick Links

- [Complete Summary](./REFACTORING_COMPLETE_SUMMARY.md)
- [Quick Start](./QUICK_START.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Verification Checklist](./VERIFICATION_CHECKLIST.md)
- [File Inventory](./FILE_INVENTORY.md)
- [Testing Guide](./TESTING.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Main README](./README.md)

## Version History

- **PR 1-8**: Complete modular refactoring (Current)
- All PRs include comprehensive documentation
- All code is tested and ready for deployment

