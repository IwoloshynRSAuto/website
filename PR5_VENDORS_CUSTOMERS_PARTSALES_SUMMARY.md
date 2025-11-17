# PR 5: Vendors, Part Sales, Customers Module

## Summary

This PR creates a comprehensive vendors module with price tracking, enhances the customers module with metrics and analytics, and adds a Part Sales module for one-off part sale quotes. All APIs use consistent response formats.

## Changed Files

### New Files

#### Vendors Module Structure
- `lib/vendors/schemas.ts` - Zod schemas for vendor validation
- `lib/vendors/service.ts` - Business logic layer (server-only)
- `lib/vendors/useVendors.ts` - Client hooks for API calls

#### Vendors API Endpoints
- `app/api/vendors/route.ts` - Vendors CRUD
- `app/api/vendors/[id]/route.ts` - Get/update vendor
- `app/api/vendors/[id]/metrics/route.ts` - Vendor dashboard metrics
- `app/api/vendors/part-prices/route.ts` - Vendor part price management

#### Customers Module Enhancement
- `lib/customers/service.ts` - Customer metrics and analytics service

#### Customers API Enhancement
- `app/api/customers/[id]/metrics/route.ts` - Customer metrics endpoint

#### Part Sales Module Structure
- `lib/part-sales/schemas.ts` - Zod schemas for part sales
- `lib/part-sales/service.ts` - Business logic layer

#### Part Sales API Endpoints
- `app/api/part-sales/route.ts` - Part sales CRUD
- `app/api/part-sales/[id]/route.ts` - Get/update part sale
- `app/api/part-sales/[id]/convert/route.ts` - Convert part sale to job

### Modified Files

- `prisma/schema.prisma` - Added `Vendor`, `VendorPartPrice`, `PurchaseOrder`, `PurchaseOrderItem` models; added `quoteType` to Quote
- `app/api/customers/route.ts` - Standardized response format, added CustomerService integration

### Database Migrations

- `prisma/migrations/20250101000004_add_vendors_and_purchase_orders/migration.sql` - Creates vendor tables
- `prisma/migrations/20250101000005_add_quote_type/migration.sql` - Adds quoteType to quotes

## New Prisma Migrations

### Migration 1: `20250101000004_add_vendors_and_purchase_orders`

**Changes:**
- Creates `vendors` table with fields:
  - `id`, `name` (unique), `contactName`, `email`, `phone`, `address`, `website`
  - `category` (ELECTRONICS, MECHANICAL, SOFTWARE, SUPPLIES, SERVICES, OTHER)
  - `notes`, `isActive`, `createdAt`, `updatedAt`
- Creates `vendor_part_prices` table with fields:
  - `id`, `vendorId`, `partId`, `price`, `leadTimeDays`
  - `effectiveDate`, `minimumOrderQuantity`, `notes`
  - Unique constraint on `[vendorId, partId, effectiveDate]` for price history
- Creates `purchase_orders` table with fields:
  - `id`, `poNumber` (unique), `vendorId`, `jobId` (optional)
  - `status` (DRAFT, SENT, RECEIVED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED)
  - `orderDate`, `expectedDate`, `receivedDate`, `totalAmount`, `notes`
- Creates `purchase_order_items` table with fields:
  - `id`, `purchaseOrderId`, `partId` (optional), `description`
  - `quantity`, `unitPrice`, `totalPrice`, `receivedQuantity`, `notes`
- Adds indexes for common queries
- Adds foreign key constraints

### Migration 2: `20250101000005_add_quote_type`

**Changes:**
- Adds `quoteType` column to `quotes` table
- Default value: 'PROJECT'
- Values: 'PROJECT', 'PART_SALE'

## Key Features

### 1. Vendors Module
- **Endpoints:** `GET/POST /api/vendors`, `GET/PATCH /api/vendors/[id]`, `GET /api/vendors/[id]/metrics`, `GET/POST /api/vendors/part-prices`
- Vendor CRUD with categories
- Vendor part price history tracking
- Lead time tracking per vendor/part
- Minimum order quantity tracking
- Vendor dashboard metrics (annual spend, orders, parts ordered)
- Purchase order support (linked to jobs)

### 2. Customers Module Enhancement
- **New Endpoint:** `GET /api/customers/[id]/metrics`
- Customer metrics: total hours, revenue, quoted amounts
- Jobs completed vs total
- Quote win rate calculation
- Active jobs count
- Standardized API response format

### 3. Part Sales Module
- **Endpoints:** `GET/POST /api/part-sales`, `GET/PATCH /api/part-sales/[id]`, `POST /api/part-sales/[id]/convert`
- One-off part sale quotes (quoteType = 'PART_SALE')
- Uses existing Quote infrastructure
- Margin/markup tracking
- Revision history (inherited from quotes)
- PDF export (inherited from quotes)
- Convert to job if installation required

### 4. Purchase Orders
- Track purchase orders linked to vendors and jobs
- Purchase order items with part references
- Status workflow: DRAFT → SENT → RECEIVED → COMPLETED
- Received quantity tracking per item
- Total amount calculation

## API Changes

### POST /api/vendors
**New Endpoint:** Create vendor

**Request:**
```json
{
  "name": "Vendor Name",
  "contactName": "John Doe",
  "email": "vendor@example.com",
  "phone": "555-1234",
  "category": "ELECTRONICS",
  "isActive": true
}
```

### GET /api/vendors/[id]/metrics
**New Endpoint:** Get vendor dashboard metrics

**Response:**
```json
{
  "success": true,
  "data": {
    "vendor": { "id": "...", "name": "..." },
    "year": 2025,
    "totalSpend": 50000,
    "totalOrders": 25,
    "totalPartsOrdered": 150,
    "uniqueParts": 45,
    "averageOrderValue": 2000
  }
}
```

### POST /api/vendors/part-prices
**New Endpoint:** Create vendor part price

**Request:**
```json
{
  "vendorId": "vendor-id",
  "partId": "part-id",
  "price": 25.50,
  "leadTimeDays": 7,
  "minimumOrderQuantity": 10
}
```

### GET /api/customers/[id]/metrics
**New Endpoint:** Get customer metrics

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": { "id": "...", "name": "..." },
    "year": 2025,
    "totalHours": 500,
    "totalRevenue": 75000,
    "totalQuoted": 100000,
    "jobsCompleted": 5,
    "jobsTotal": 8,
    "quotesWon": 10,
    "quotesTotal": 15,
    "winRate": 66.67
  }
}
```

### POST /api/part-sales
**New Endpoint:** Create part sale quote

**Request:**
```json
{
  "bomId": "bom-id",
  "customerId": "customer-id",
  "title": "Part Sale Quote",
  "margin": 30,
  "markup": 20
}
```

### POST /api/part-sales/[id]/convert
**New Endpoint:** Convert part sale to job

**Request:**
```json
{
  "assignedToId": "user-id",
  "startDate": "2025-01-15T00:00:00Z"
}
```

## Migration Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations
```bash
# Generate Prisma client
npm run db:generate

# Apply migrations
npx prisma migrate deploy
```

### 3. Backfill Existing Quotes
```sql
-- Set all existing quotes to PROJECT type
UPDATE quotes SET "quoteType" = 'PROJECT' WHERE "quoteType" IS NULL;
```

### 4. Test Vendors
```bash
# Create vendor
curl -X POST http://localhost:3000/api/vendors \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "name": "Test Vendor",
    "category": "ELECTRONICS"
  }'
```

## Breaking Changes

### Quote Model
- Added `quoteType` field (default: 'PROJECT')
- Existing quotes will have `quoteType = 'PROJECT'`
- New part sales will have `quoteType = 'PART_SALE'`

### Customer API Response Format
- Old: Direct array/object response
- New: `{ success: boolean, data?, error? }` format
- Frontend code using old format needs updating

## Testing Checklist

- [ ] Create vendor → Vendor created
- [ ] Create vendor part price → Price history tracked
- [ ] Get vendor metrics → Returns annual spend, orders, parts
- [ ] Create part sale → Quote created with quoteType = 'PART_SALE'
- [ ] Get part sales → Only returns PART_SALE quotes
- [ ] Convert part sale to job → Job created from part sale
- [ ] Get customer metrics → Returns hours, revenue, win rate
- [ ] Customer API standardized → Consistent response format
- [ ] Create purchase order → PO created and linked to vendor/job
- [ ] Update purchase order status → Status workflow works

## Next Steps (Future PRs)

- Create vendor dashboard UI
- Create part sales UI
- Add purchase order management UI
- Add vendor spend analytics charts
- Add customer profitability reports
- Add part sales margin/markup calculations
- Add purchase order approval workflow

## Notes

- Part Sales leverage existing Quote infrastructure
- Vendor part prices support price history (multiple prices per vendor/part)
- Purchase orders can be linked to jobs for cost tracking
- Customer metrics calculated server-side for performance
- All APIs follow consistent response format
- Quote type distinguishes project quotes from part sales

