# Quick Start Guide

Get up and running with the refactored Timekeeping Portal quickly.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Set up database
npm run db:push
npm run db:generate

# 4. Run migrations
npm run db:migrate

# 5. (Optional) Backfill file records
node scripts/backfill-file-records.js
```

## Running the Application

```bash
# Development server
npm run dev

# Production build
npm run build
npm start
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Key Commands

### Database
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio

### Development
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run lint` - Run linter

### Testing
- `npm test` - Run unit tests
- `npm run test:watch` - Watch mode
- `npm run test:coverage` - Coverage report
- `npm run test:e2e` - E2E tests

## Module Structure

```
/app/api/{module}/     # API endpoints
/lib/{module}/         # Service layer, schemas, hooks
/components/{module}/  # UI components
```

## API Endpoints

### Quotes
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote
- `GET /api/quotes/[id]` - Get quote
- `PUT /api/quotes/[id]` - Update quote
- `POST /api/quotes/[id]/export` - Export PDF

### Jobs
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job
- `POST /api/jobs/convert` - Convert quote to job
- `GET /api/jobs/[id]/costs` - Get job costs

### Analytics
- `GET /api/analytics/dashboard` - All metrics
- `GET /api/analytics/hours` - Hours logged
- `GET /api/analytics/profitability` - Job profitability
- `GET /api/analytics/win-loss` - Win/loss rates

## Environment Variables

### Required
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-secret
MICROSOFT_TENANT_ID=your-tenant-id
```

### Storage (Optional)
```env
STORAGE_ADAPTER=local  # or s3
STORAGE_BASE_PATH=./storage
# For S3:
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_KEY=your-key
S3_SECRET=your-secret
S3_BUCKET=your-bucket
```

## Common Issues

### Database Connection
```bash
# Check DATABASE_URL is correct
# Verify PostgreSQL is running
# Check network connectivity
```

### Authentication
```bash
# Verify Azure AD credentials
# Check NEXTAUTH_SECRET is set
# Verify NEXTAUTH_URL matches your domain
```

### Storage
```bash
# Test storage adapter
curl http://localhost:3000/api/storage/test

# Check storage permissions
# Verify S3 credentials if using S3
```

## Next Steps

1. Review [REFACTORING_COMPLETE_SUMMARY.md](./REFACTORING_COMPLETE_SUMMARY.md)
2. Check [TESTING.md](./TESTING.md) for testing guide
3. Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for deployment
4. Explore individual PR summaries for module details

## Getting Help

- Check documentation in `/docs` or root directory
- Review test files for usage examples
- Review API endpoint implementations
- Check CI logs for build issues
