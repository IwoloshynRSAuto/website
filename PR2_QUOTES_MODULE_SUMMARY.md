# PR 2: Quotes Module - Storage Integration, PDF Generation, and Modular Structure

## Summary

This PR integrates the storage adapter into the quotes module, adds PDF generation capability, creates a modular quotes structure with service layer, and adds quote revision tracking.

## Changed Files

### New Files

#### Quotes Module Structure
- `lib/quotes/schemas.ts` - Zod schemas for quote validation
- `lib/quotes/service.ts` - Business logic layer (server-only)
- `lib/quotes/useQuotes.ts` - Client hooks for API calls

#### PDF Generation
- `lib/pdf/quote-pdf.ts` - PDFKit-based quote PDF generator
- `app/api/quotes/[id]/export/route.ts` - PDF export endpoint

#### UI Components
- `components/quotes/quote-file-viewer.tsx` - Updated file viewer using FileRecord

#### API Endpoints
- `app/api/quotes/[id]/files/[fileRecordId]/route.ts` - Delete file endpoint

### Modified Files

- `prisma/schema.prisma` - Added `QuoteRevision` model
- `app/api/quotes/route.ts` - Updated to use QuoteService, added filters, returns FileRecord data
- `app/api/quotes/[id]/route.ts` - Updated to use QuoteService, includes FileRecord and revisions
- `app/api/quotes/[id]/upload/route.ts` - Now uses storage adapter and creates FileRecord
- `app/api/quotes/files/[path]/route.ts` - Updated to use storage adapter
- `package.json` - Added `pdfkit` and `@types/pdfkit`

### Database Migration

- `prisma/migrations/20250101000001_add_quote_revision_model/migration.sql` - Creates `quote_revisions` table

## New Prisma Migration

**Migration Name:** `20250101000001_add_quote_revision_model`

**Changes:**
- Creates `quote_revisions` table with fields:
  - `id` (String, primary key)
  - `quoteId` (String) - Foreign key to Quote
  - `revisionNumber` (Int) - Revision number
  - `data` (Json) - Snapshot of quote data
  - `createdById` (String) - Foreign key to User
  - `createdAt` (DateTime)
- Creates indexes on `quoteId` and `createdById`
- Creates unique constraint on `[quoteId, revisionNumber]`
- Adds foreign key constraints with cascade delete

## Key Features

### 1. Storage Integration
- Quote file uploads now use storage adapter (local or S3)
- FileRecord entries created automatically on upload
- Multiple files per quote supported
- File deletion uses storage adapter

### 2. PDF Generation
- Server-side PDF generation using PDFKit
- Branded quote PDFs with:
  - Quote header and number
  - Customer information
  - BOM parts table with pricing
  - Totals and payment terms
- PDFs saved to storage and linked via FileRecord
- Export endpoint: `POST /api/quotes/[id]/export`

### 3. Quote Revisions
- Automatic revision creation on quote create/update
- Revision history tracking
- JSON snapshot of quote data at each revision
- Revision number auto-increments

### 4. Modular Structure
- Service layer for business logic
- Zod schemas for validation
- Client hooks for API calls
- Consistent error handling

### 5. Enhanced API
- Consistent response format: `{ success: boolean, data?, error? }`
- Filter support: status, customer, search, date range
- FileRecord data included in responses
- Revision history included in quote detail

## Environment Variables

No new environment variables required (uses existing storage configuration from PR 1).

## API Changes

### GET /api/quotes
**New Query Parameters:**
- `status` - Filter by status (DRAFT, SENT, WON, LOST)
- `customerId` - Filter by customer
- `search` - Search in quote number, title, customer name
- `startDate` - Filter by creation date (ISO string)
- `endDate` - Filter by creation date (ISO string)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "quoteNumber": "Q0001",
      "title": "...",
      "status": "DRAFT",
      "fileCount": 2,
      "fileRecords": [...],
      ...
    }
  ]
}
```

### POST /api/quotes/[id]/export
**New Endpoint:** Generate and download quote PDF

**Response:** PDF file download

### DELETE /api/quotes/[id]/files/[fileRecordId]
**New Endpoint:** Delete a file from a quote

## UI Changes

### Quote File Viewer
- Now supports multiple files per quote
- Shows file list when multiple files exist
- Displays file metadata (size, upload date)
- Uses FileRecord API endpoints
- Improved file management UI

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

### 3. Update Existing Quotes (Optional)
If you want to create initial revisions for existing quotes:
```bash
# Create a script to backfill revisions
node scripts/backfill-quote-revisions.js
```

### 4. Test PDF Generation
```bash
# Start development server
npm run dev

# Test PDF export
curl -X POST http://localhost:3000/api/quotes/[quoteId]/export \
  -H "Cookie: next-auth.session-token=..."
```

## Breaking Changes

### API Response Format
- All quote API endpoints now return `{ success: boolean, data?, error? }` format
- Frontend code using old format needs updating

### File Upload Response
- Old: `{ quote: {...}, filePath: "..." }`
- New: `{ success: true, data: { quote: {...}, fileRecord: {...} } }`

### Quote Status Values
- Old statuses: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`
- New statuses: `DRAFT`, `SENT`, `WON`, `LOST`
- Existing quotes with old statuses will need migration

## Testing Checklist

- [ ] Create quote → FileRecord created
- [ ] Upload quote file → Uses storage adapter
- [ ] Download quote file → Uses storage adapter
- [ ] Export PDF → Generates and downloads PDF
- [ ] Create quote → Initial revision created
- [ ] Update quote status → Revision created
- [ ] Filter quotes by status → Works correctly
- [ ] Search quotes → Works correctly
- [ ] Delete quote file → File deleted from storage
- [ ] Multiple files per quote → All files shown
- [ ] Quote revision history → Revisions displayed

## Next Steps (Future PRs)

- Integrate new quote file viewer into quote detail pages
- Add quote revision comparison UI
- Add quote status workflow UI
- Add quote dashboard with KPIs
- Add quote-to-job conversion flow

## Notes

- PDF generation uses PDFKit (lightweight, Node-friendly)
- Quote revisions are created automatically on significant changes
- FileRecord entries are created for all file operations
- Storage adapter abstraction allows switching between local/S3 without code changes
- All API responses follow consistent format for easier frontend integration

