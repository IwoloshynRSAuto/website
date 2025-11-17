# Changelog

All notable changes to the Timekeeping Portal project are documented in this file.

## [Unreleased] - Modular Refactoring (PR 1-8)

### Added

#### PR 1: Storage Adapter + FileRecord Model
- Storage abstraction layer supporting local filesystem and S3-compatible storage
- `FileRecord` Prisma model for centralized file metadata
- `LocalStorageAdapter` and `S3StorageAdapter` implementations
- Storage health check API endpoint (`/api/storage/test`)
- File serving API endpoint (`/api/storage/files/[path]`)
- Backfill script for existing files (`scripts/backfill-file-records.js`)
- Storage migration script (`scripts/storage-migrate.js`)
- Unit tests for storage adapters

#### PR 2: Quotes Module
- Modular Quotes module structure (`lib/quotes/`)
- `QuoteRevision` model for version control
- `QuoteService` with full CRUD operations
- Client-side React hooks (`useQuotes`)
- PDF export functionality using PDFKit
- Quote file upload and management
- Standardized API responses
- Quote revision tracking
- API endpoints:
  - `GET /api/quotes` - List quotes
  - `POST /api/quotes` - Create quote
  - `GET /api/quotes/[id]` - Get quote
  - `PUT /api/quotes/[id]` - Update quote
  - `DELETE /api/quotes/[id]` - Delete quote
  - `POST /api/quotes/[id]/export` - Export PDF
  - `POST /api/quotes/[id]/upload` - Upload file

#### PR 3: Jobs Module + Quote-to-Job Conversion
- Modular Jobs module structure (`lib/jobs/`)
- `JobMilestone` model for milestone tracking
- `JobService` with full CRUD operations
- Client-side React hooks (`useJobs`)
- Quote-to-job conversion flow
- Job cost tracking and analysis
- Engineering Change Orders (ECOs) support
- API endpoints:
  - `GET /api/jobs` - List jobs
  - `POST /api/jobs` - Create job
  - `POST /api/jobs/convert` - Convert quote to job
  - `GET /api/jobs/[id]` - Get job
  - `PUT /api/jobs/[id]` - Update job
  - `DELETE /api/jobs/[id]` - Delete job
  - `GET /api/jobs/[id]/costs` - Get job costs
  - `GET /api/jobs/[id]/milestones` - Get milestones
  - `POST /api/jobs/[id]/milestones` - Create milestone
  - `GET /api/jobs/[id]/ecos` - Get ECOs

#### PR 4: Timekeeping/Employee Module + Approvals
- Modular Timekeeping module structure (`lib/timekeeping/`)
- `TimeOffRequest` model for time-off management
- `ExpenseReport` model for expense tracking
- `ServiceReport` model for on-site service reports
- `TimekeepingService` with full CRUD operations
- Client-side React hooks (`useTimekeeping`)
- Timesheet approval workflows
- Expense receipt upload support
- API endpoints:
  - `GET /api/timekeeping/time-off` - List time-off requests
  - `POST /api/timekeeping/time-off` - Create request
  - `GET /api/timekeeping/time-off/[id]` - Get request
  - `PUT /api/timekeeping/time-off/[id]` - Update request
  - `DELETE /api/timekeeping/time-off/[id]` - Delete request
  - `GET /api/timekeeping/expenses` - List expenses
  - `POST /api/timekeeping/expenses` - Create expense
  - `GET /api/timekeeping/expenses/[id]` - Get expense
  - `POST /api/timekeeping/expenses/[id]/receipt` - Upload receipt
  - `GET /api/timekeeping/service-reports` - List reports
  - `POST /api/timekeeping/service-reports` - Create report

#### PR 5: Vendors, Part Sales, Customers Module
- Modular Vendors module structure (`lib/vendors/`)
- Modular Part Sales module structure (`lib/part-sales/`)
- Enhanced Customers module (`lib/customers/service.ts`)
- `Vendor` model for vendor management
- `VendorPartPrice` model for price history tracking
- `PurchaseOrder` and `PurchaseOrderItem` models
- `quoteType` field added to `Quote` model
- `VendorService` with full CRUD operations
- `PartSalesService` for part sales management
- Enhanced `CustomerService` with metrics
- Client-side React hooks (`useVendors`)
- API endpoints:
  - `GET /api/vendors` - List vendors
  - `POST /api/vendors` - Create vendor
  - `GET /api/vendors/[id]` - Get vendor
  - `PUT /api/vendors/[id]` - Update vendor
  - `DELETE /api/vendors/[id]` - Delete vendor
  - `GET /api/vendors/[id]/metrics` - Get vendor metrics
  - `GET /api/vendors/part-prices` - Get part prices
  - `GET /api/part-sales` - List part sales
  - `POST /api/part-sales` - Create part sale
  - `GET /api/part-sales/[id]` - Get part sale
  - `POST /api/part-sales/[id]/convert` - Convert to job
  - `GET /api/customers/[id]/metrics` - Get customer metrics

#### PR 6: Analytics and Dashboards
- Modular Analytics module structure (`lib/analytics/`)
- `AnalyticsService` with comprehensive metrics
- Hours logged metrics with breakdowns
- Quoted vs actual comparison metrics
- Job profitability analysis
- Win/loss rate tracking
- BOM variance metrics
- Productivity metrics
- Dashboard endpoint with all metrics
- API endpoints:
  - `GET /api/analytics/hours` - Hours logged
  - `GET /api/analytics/quoted-vs-actual` - Quoted vs actual
  - `GET /api/analytics/profitability` - Job profitability
  - `GET /api/analytics/win-loss` - Win/loss rates
  - `GET /api/analytics/bom-variance` - BOM variance
  - `GET /api/analytics/productivity` - Productivity
  - `GET /api/analytics/dashboard` - All metrics

#### PR 7: Roles & Permissions Centralization + UI Standardization
- Centralized authorization module (`lib/auth/authorization.ts`)
- Capability-based access control system
- Role capability map for 8 roles (ADMIN, PROJECT_MANAGER, ENGINEER, TECHNICIAN, SALES, ACCOUNTING, CLIENT_PORTAL, plus legacy USER/MANAGER)
- Authorization helper functions:
  - `authorize()` - Check user capabilities
  - `authorizeOwnResource()` - Check with ownership
  - `getCapabilities()` - Get user capabilities
  - `hasAnyCapability()` - Check if user has any capability
  - `isAdmin()` - Check if admin
  - `isManagerOrAbove()` - Check if manager or above
- Shared UI components:
  - `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`
  - `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
  - `ConfirmDialog` - Confirmation dialogs
  - `SearchInput` - Search input with clear button
  - `PaginatedTable` - Generic paginated table
  - `FileUploader` - File upload component
- Form standardization:
  - `useFormWithValidation` hook with React Hook Form + Zod
  - Helper functions for error handling
- Updated API endpoints to use authorization helpers
- Standardized API response format

#### PR 8: Tests + CI + Docs
- Jest testing infrastructure
  - `jest.config.js` - Jest configuration
  - `jest.setup.js` - Test setup with mocks
  - Unit tests for service layers
  - Integration tests for API endpoints
- Playwright E2E testing
  - `playwright.config.ts` - Playwright configuration
  - Smoke tests for main flows
- GitHub Actions CI workflow
  - Automated testing on push/PR
  - PostgreSQL service setup
  - Test coverage reporting
  - Build verification
- Comprehensive documentation:
  - `TESTING.md` - Testing guide
  - `REFACTORING_COMPLETE_SUMMARY.md` - Complete overview
  - `DOCUMENTATION_INDEX.md` - Documentation index
  - `DEPLOYMENT_CHECKLIST.md` - Deployment guide
  - `QUICK_START.md` - Quick start guide
  - `IMPLEMENTATION_GUIDE.md` - Implementation examples
  - `FINAL_STATUS_REPORT.md` - Status report
  - `CHANGELOG.md` - This file
  - 8 PR summary documents

### Changed

- **API Response Format**: All API endpoints now return standardized `{ success: boolean, data?, error? }` format
- **Authorization**: Replaced scattered role checks with centralized `authorize()` helper
- **Storage**: Migrated from direct filesystem access to storage abstraction layer
- **Forms**: Standardized form architecture using React Hook Form + Zod
- **UI Components**: Standardized UI components using shared components

### Database Schema Changes

#### New Models
- `FileRecord` - File metadata and storage references
- `QuoteRevision` - Quote version control
- `JobMilestone` - Job milestone tracking
- `TimeOffRequest` - Time-off request management
- `ExpenseReport` - Expense tracking with receipts
- `ServiceReport` - On-site service reports
- `Vendor` - Vendor management
- `VendorPartPrice` - Vendor part price history
- `PurchaseOrder` - Purchase order tracking
- `PurchaseOrderItem` - Purchase order line items

#### Enhanced Models
- `Quote` - Added `quoteType` field for part sales
- `Job` - Added relations for milestones, change orders
- `User` - Enhanced with expanded role system
- `BOM` - Linked to quotes and jobs

### Dependencies Added

#### Production
- `@aws-sdk/client-s3` - AWS S3 SDK
- `@aws-sdk/s3-request-presigner` - S3 signed URL generation
- `pdfkit` - PDF generation
- `@types/pdfkit` - PDFKit TypeScript types

#### Development
- `jest` - Testing framework
- `jest-environment-jsdom` - Jest DOM environment
- `@playwright/test` - E2E testing
- `@types/jest` - Jest TypeScript types
- `node-mocks-http` - HTTP mocking for tests

### Environment Variables Added

- `STORAGE_ADAPTER` - Storage adapter type (local or s3)
- `STORAGE_BASE_PATH` - Base path for local storage
- `S3_ENDPOINT` - S3 endpoint URL
- `S3_KEY` - S3 access key
- `S3_SECRET` - S3 secret key
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - S3 region (optional)
- `S3_PUBLIC_URL` - Public URL for files (optional)

### Scripts Added

- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run E2E tests
- `npm run test:e2e:ui` - Run E2E tests with UI

### Migration Notes

- All new database tables/columns are nullable by default for safety
- Backfill scripts provided for critical data
- Rollback scripts available in `prisma/migrations/`
- Storage migration script supports dry-run mode

### Breaking Changes

- **API Response Format**: Frontend code using old API response format needs updating
- **Authorization**: Old direct role checks (`session.user.role !== 'ADMIN'`) should be migrated to `authorize()` helper (backward compatible for now)

### Security

- Centralized authorization prevents privilege escalation
- File uploads validated by storage adapter
- API endpoints require authentication
- Role-based access control enforced

### Performance

- Server-side metrics calculations for performance
- Efficient Prisma queries with proper relations
- Dashboard endpoint uses parallel queries
- Storage abstraction allows easy migration to CDN

### Documentation

- Complete refactoring summary
- Individual PR summaries
- Testing guide
- Deployment checklist
- Implementation guide
- Quick start guide
- Documentation index

## Migration Guide

See individual PR summaries for detailed migration steps:
- PR 1: Storage migration and FileRecord backfill
- PR 2-8: Database migrations and code updates

## Upgrade Path

1. Review `DEPLOYMENT_CHECKLIST.md`
2. Run database migrations
3. Run backfill scripts
4. Update environment variables
5. Deploy code changes
6. Verify functionality

## Support

For questions or issues:
- Check `DOCUMENTATION_INDEX.md` for navigation
- Review PR summaries for module details
- See `TESTING.md` for testing help
- Review `IMPLEMENTATION_GUIDE.md` for code examples

