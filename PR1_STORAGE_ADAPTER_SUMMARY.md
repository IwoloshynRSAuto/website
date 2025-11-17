# PR 1: Storage Adapter + FileRecord Model + Backfill Script

## Summary

This PR implements a storage abstraction layer with support for local filesystem and S3-compatible storage (DigitalOcean Spaces, AWS S3), adds a `FileRecord` Prisma model to track all stored files, and provides migration scripts for backfilling existing files.

## Changed Files

### New Files

#### Storage Abstraction Layer
- `lib/storage/types.ts` - TypeScript interfaces for storage adapters
- `lib/storage/adapters/local.ts` - Local filesystem storage adapter
- `lib/storage/adapters/s3.ts` - S3-compatible storage adapter
- `lib/storage/index.ts` - Storage abstraction initialization and factory

#### API Endpoints
- `app/api/storage/test/route.ts` - Health check endpoint for storage adapter
- `app/api/storage/files/[path]/route.ts` - File download endpoint with authentication

#### Scripts
- `scripts/backfill-file-records.js` - Backfill script to create FileRecord entries for existing files
- `scripts/storage-migrate.js` - Migration script to copy files from local to S3

#### Tests
- `lib/storage/__tests__/local-adapter.test.ts` - Unit tests for LocalStorageAdapter
- `lib/storage/__tests__/storage.test.ts` - Integration tests for storage abstraction

### Modified Files

- `prisma/schema.prisma` - Added `FileRecord` model with relations to User, Job, and Quote
- `package.json` - Added AWS SDK dependencies (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- `env.example` - Added storage configuration environment variables
- `README.md` - Added storage configuration, migration instructions, and environment variable documentation

### Database Migration

- `prisma/migrations/20250101000000_add_file_record_model/migration.sql` - Creates `file_records` table with indexes and foreign keys

## New Prisma Migration

**Migration Name:** `20250101000000_add_file_record_model`

**Changes:**
- Creates `file_records` table with fields:
  - `id` (String, primary key)
  - `storagePath` (String) - Path in storage
  - `fileUrl` (String, nullable) - Public URL or signed URL
  - `fileName` (String) - Original filename
  - `fileType` (String) - MIME type
  - `fileSize` (Int, nullable) - File size in bytes
  - `metadata` (Json, nullable) - Additional metadata
  - `createdById` (String) - Foreign key to User
  - `linkedJobId` (String, nullable) - Foreign key to Job
  - `linkedQuoteId` (String, nullable) - Foreign key to Quote
  - `createdAt`, `updatedAt` (DateTime)
- Creates indexes on `linkedJobId`, `linkedQuoteId`, `createdById`, `fileType`
- Adds foreign key constraints with appropriate cascade rules

## Environment Variables Added

### Storage Configuration
- `STORAGE_ADAPTER` - Storage adapter to use: `local` (default) or `s3`
- `STORAGE_BASE_PATH` - Base path for local storage (default: `./storage`)

### S3 Storage (required when `STORAGE_ADAPTER=s3`)
- `S3_ENDPOINT` - S3 endpoint URL (e.g., `https://nyc3.digitaloceanspaces.com`)
- `S3_KEY` - S3 access key ID
- `S3_SECRET` - S3 secret access key
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - S3 region (optional, default: `us-east-1`)
- `S3_PUBLIC_URL` - Public URL for files (optional)

## Test Summary

### Unit Tests
- **LocalStorageAdapter tests** (`lib/storage/__tests__/local-adapter.test.ts`):
  - ✅ Upload file to storage
  - ✅ Create nested directories
  - ✅ Download file from storage
  - ✅ Delete file from storage
  - ✅ Check file existence
  - ✅ Get signed URL (returns API route)
  - ✅ Get public URL (returns null for local)
  - ✅ Health check (healthy and unhealthy scenarios)

### Integration Tests
- **Storage abstraction tests** (`lib/storage/__tests__/storage.test.ts`):
  - ✅ Initialize local storage by default
  - ✅ Initialize local storage when `STORAGE_ADAPTER=local`
  - ✅ Throw error for S3 without required env vars
  - ✅ Use `STORAGE_BASE_PATH` for local storage
  - ✅ Return same instance on multiple calls
  - ✅ Initialize if not already initialized
  - ✅ Reset storage instance

### API Endpoint Tests
- Manual testing required for:
  - `GET /api/storage/test` - Health check endpoint
  - `GET /api/storage/files/[path]` - File download endpoint

## Manual QA Checklist

### Pre-Deployment
- [ ] Review Prisma schema changes
- [ ] Verify migration SQL is correct
- [ ] Test migration on staging database
- [ ] Verify environment variables are documented

### Storage Adapter Testing
- [ ] Test local storage adapter:
  - [ ] Upload file
  - [ ] Download file
  - [ ] Delete file
  - [ ] Health check endpoint returns healthy
- [ ] Test S3 storage adapter (if applicable):
  - [ ] Configure S3 environment variables
  - [ ] Upload file to S3
  - [ ] Download file from S3
  - [ ] Verify signed URLs work
  - [ ] Health check endpoint returns healthy

### Backfill Script Testing
- [ ] Run backfill script in dry-run mode:
  ```bash
  node scripts/backfill-file-records.js --dry-run
  ```
- [ ] Verify output shows correct files to process
- [ ] Run backfill script:
  ```bash
  node scripts/backfill-file-records.js
  ```
- [ ] Verify FileRecord entries created in database
- [ ] Verify files linked to quotes/jobs where applicable

### API Endpoint Testing
- [ ] Test storage health check endpoint:
  ```bash
  curl -H "Cookie: next-auth.session-token=..." http://localhost:3000/api/storage/test
  ```
- [ ] Test file download endpoint:
  ```bash
  curl -H "Cookie: next-auth.session-token=..." http://localhost:3000/api/storage/files/quotes/quote-Q0001.pdf
  ```
- [ ] Verify authentication is required
- [ ] Verify path traversal protection works

### Database Migration
- [ ] Run Prisma migration:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Verify `file_records` table created
- [ ] Verify indexes created
- [ ] Verify foreign key constraints work
- [ ] Test rollback (if needed)

### Integration Testing
- [ ] Verify existing file uploads still work (quotes, etc.)
- [ ] Verify no breaking changes to existing functionality
- [ ] Test file download through new API endpoint
- [ ] Verify FileRecord entries are created for new uploads (future PR)

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

### 3. Backfill Existing Files (Optional but Recommended)
```bash
# Preview changes
node scripts/backfill-file-records.js --dry-run

# Apply backfill
node scripts/backfill-file-records.js
```

### 4. Update Environment Variables
Add storage configuration to your `.env` file:
```bash
STORAGE_ADAPTER=local
STORAGE_BASE_PATH=./storage
```

For S3:
```bash
STORAGE_ADAPTER=s3
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_KEY=your-access-key
S3_SECRET=your-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
```

### 5. Test Storage Adapter
```bash
# Start development server
npm run dev

# Test health check endpoint (requires authentication)
curl http://localhost:3000/api/storage/test
```

## Rollback Plan

If issues occur after deployment:

1. **Database Rollback:**
   ```bash
   # Revert migration (if needed)
   # Check prisma/migrations/ for rollback SQL
   ```

2. **Code Rollback:**
   - Revert to previous commit
   - Storage adapter is backward compatible with existing code

3. **File Records:**
   - FileRecord entries are non-destructive
   - Existing files remain in storage
   - Can safely delete FileRecord entries if needed

## Notes

- Storage adapter is initialized lazily on first use
- Local storage is the default (no breaking changes)
- S3 adapter requires AWS SDK v3 packages
- File download endpoint includes path traversal protection
- Health check endpoint requires authentication
- Backfill script can be run multiple times safely (skips existing records)

## Next Steps (Future PRs)

- Integrate storage adapter into existing file upload endpoints
- Add FileRecord creation to file upload flows
- Implement PDF generation using storage adapter
- Add file management UI components

