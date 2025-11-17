# Timekeeping Portal

A simplified web application focused on core timekeeping and job management features.

## Features

### Employee Management
- Create, edit, and remove employees
- View list of all employees
- Link employees to their time sheets and jobs

### Job Management
- Create, edit, and remove job listings
- Each job has a unique Job Code
- Associate employees and time sheets with specific jobs

### Time Sheet System
- Create time sheets for specific jobs and employees
- Time sheets are editable even after approval
- Time sheets can be deleted if needed
- Include fields for start time, end time, total hours, and approval status

## Tech Stack

- **Frontend**: Next.js 16.0.1, React 18.3.1, TypeScript
- **UI Components**: ShadCN/ui (Radix UI), Tailwind CSS 4.1.16
- **Database**: PostgreSQL with Prisma ORM 6.18.0
- **Authentication**: NextAuth.js v4 with Azure AD
- **Storage**: Local filesystem or S3-compatible storage (DigitalOcean Spaces, AWS S3)
- **Testing**: Jest (unit/integration), Playwright (E2E)
- **PDF Generation**: PDFKit
- **Form Management**: React Hook Form + Zod

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database:
   ```bash
   npm run db:push
   ```

3. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

4. Run database migrations:
   ```bash
   npm run db:migrate
   ```

5. (Optional) Backfill file records:
   ```bash
   node scripts/backfill-file-records.js
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Testing

Run unit tests:
```bash
npm test
```

Run E2E tests:
```bash
npm run test:e2e
```

See [TESTING.md](./TESTING.md) for detailed testing documentation.

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The app uses a simplified schema with these core models:

- **User** (Employees) - Employee information and authentication
- **Job** - Job listings and management
- **TimeEntry** - Individual time entries
- **TimesheetSubmission** - Weekly timesheet submissions
- **LaborCode** - Job codes for categorization

## Documentation

- **[Documentation Index](./DOCUMENTATION_INDEX.md)** - Complete documentation navigation
- **[Quick Start Guide](./QUICK_START.md)** - Get started quickly
- **[Implementation Guide](./IMPLEMENTATION_GUIDE.md)** - Code examples and usage
- **[Testing Guide](./TESTING.md)** - Testing documentation
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Deployment guide
- **[Changelog](./CHANGELOG.md)** - Complete changelog

## Navigation

The app has a modular structure with the following modules:
- **Quotes** - Quote management, PDF export, revisions
- **Jobs** - Job management, milestones, cost tracking
- **Timekeeping** - Time-off, expenses, service reports
- **Vendors** - Vendor management, price history
- **Part Sales** - One-off part sales
- **Customers** - Customer management with metrics
- **Analytics** - Comprehensive metrics and dashboards
- **Admin** - Employee management, labor codes, approvals

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - Secret for NextAuth session encryption
- `MICROSOFT_CLIENT_ID` - Azure AD application client ID
- `MICROSOFT_CLIENT_SECRET` - Azure AD application client secret
- `MICROSOFT_TENANT_ID` - Azure AD tenant ID

### Storage Configuration

#### Local Storage (Default)
- `STORAGE_ADAPTER=local` (optional, default)
- `STORAGE_BASE_PATH` - Base path for file storage (default: `./storage`)

#### S3 Storage (DigitalOcean Spaces / AWS S3)
- `STORAGE_ADAPTER=s3`
- `S3_ENDPOINT` - S3 endpoint URL (e.g., `https://nyc3.digitaloceanspaces.com`)
- `S3_KEY` - S3 access key ID
- `S3_SECRET` - S3 secret access key
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - S3 region (optional, default: `us-east-1`)
- `S3_PUBLIC_URL` - Public URL for files (optional)

See `env.example` for a complete list of environment variables.

## Storage Migration

### Backfill File Records

After adding the `FileRecord` model, backfill existing files:

```bash
# Dry run (preview changes)
node scripts/backfill-file-records.js --dry-run

# Apply changes
node scripts/backfill-file-records.js
```

This script:
- Scans the storage directory for existing files
- Creates `FileRecord` entries in the database
- Links files to quotes/jobs if filename patterns match

### Migrate to S3

To migrate files from local storage to S3:

1. Set S3 environment variables:
   ```bash
   export STORAGE_ADAPTER=s3
   export S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
   export S3_KEY=your-access-key
   export S3_SECRET=your-secret-key
   export S3_BUCKET=your-bucket-name
   ```

2. Run migration:
   ```bash
   # Dry run (preview changes)
   node scripts/storage-migrate.js --dry-run

   # Apply migration
   node scripts/storage-migrate.js
   ```

3. Verify files are accessible in S3

4. Update production environment variables

5. Keep local files as backup until verified

## Database Migrations

### Running Migrations

```bash
# Create a new migration
npm run db:migrate

# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma client after schema changes
npm run db:generate
```

### Migration Safety

- New tables/columns are added as nullable by default
- Backfill scripts are provided for critical data
- Rollback scripts are available in `prisma/migrations/`

## Development

- Run linting: `npm run lint`
- View database: `npm run db:studio`
- Build for production: `npm run build`
- Test storage adapter: `GET /api/storage/test` (requires authentication)

