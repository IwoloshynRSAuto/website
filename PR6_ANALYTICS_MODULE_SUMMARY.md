# PR 6: Analytics & Dashboards Module

## Summary

This PR creates a comprehensive analytics module with server-side metrics endpoints for hours logged, quoted vs actual, job profitability, win/loss rates, BOM variance, and productivity. All metrics are calculated server-side using Prisma aggregate queries for performance.

## Changed Files

### New Files

#### Analytics Module Structure
- `lib/analytics/schemas.ts` - Zod schemas for analytics filters
- `lib/analytics/service.ts` - Business logic layer for all metrics calculations

#### Analytics API Endpoints
- `app/api/analytics/hours/route.ts` - Hours logged metrics
- `app/api/analytics/quoted-vs-actual/route.ts` - Quoted vs actual comparison
- `app/api/analytics/profitability/route.ts` - Job profitability metrics
- `app/api/analytics/win-loss/route.ts` - Win/loss rate metrics
- `app/api/analytics/bom-variance/route.ts` - BOM variance metrics
- `app/api/analytics/productivity/route.ts` - Productivity metrics
- `app/api/analytics/dashboard/route.ts` - Comprehensive dashboard (all metrics)

### Modified Files

- No database schema changes (uses existing models)

## Key Features

### 1. Hours Logged Metrics
- **Endpoint:** `GET /api/analytics/hours`
- Total regular hours, overtime hours, total hours
- Breakdown by user, labor code, and job
- Filter by date range, user, job, year/month

### 2. Quoted vs Actual Metrics
- **Endpoint:** `GET /api/analytics/quoted-vs-actual`
- Compare quoted hours/cost vs actual hours/cost
- Variance calculations (absolute and percentage)
- Per-job breakdown and aggregate totals
- Filter by date range, job, customer, year/month

### 3. Job Profitability Metrics
- **Endpoint:** `GET /api/analytics/profitability`
- Revenue (estimated cost) vs total cost (labor + materials)
- Profit and profit margin calculations
- Per-job breakdown and aggregate totals
- Filter by date range, customer, year/month

### 4. Win/Loss Rate Metrics
- **Endpoint:** `GET /api/analytics/win-loss`
- Total quotes, won, lost, sent, draft counts
- Win rate and loss rate percentages
- Total quoted value, won value, lost value
- Average quote value and average won value
- Breakdown by customer
- Filter by date range, customer, year/month

### 5. BOM Variance Metrics
- **Endpoint:** `GET /api/analytics/bom-variance`
- Quoted cost vs quoted price per BOM
- Margin and margin percentage calculations
- Per-BOM breakdown and aggregate totals
- Filter by job

### 6. Productivity Metrics
- **Endpoint:** `GET /api/analytics/productivity`
- Daily productivity by user
- Average hours per day per user
- Total entries and hours
- Filter by date range, user, year/month

### 7. Dashboard Metrics
- **Endpoint:** `GET /api/analytics/dashboard`
- Returns all metrics in a single call
- Optimized for dashboard loading
- Supports all filters

## API Examples

### GET /api/analytics/hours?year=2025&userId=user-id
**Response:**
```json
{
  "success": true,
  "data": {
    "totalRegularHours": 1200,
    "totalOvertimeHours": 150,
    "totalHours": 1350,
    "totalEntries": 250,
    "byUser": [
      {
        "user": { "id": "...", "name": "..." },
        "regularHours": 800,
        "overtimeHours": 100,
        "totalHours": 900,
        "entries": 150
      }
    ],
    "byLaborCode": [...],
    "byJob": [...]
  }
}
```

### GET /api/analytics/quoted-vs-actual?year=2025
**Response:**
```json
{
  "success": true,
  "data": {
    "totals": {
      "quotedHours": 1000,
      "actualHours": 1200,
      "hoursVariance": 200,
      "hoursVariancePercent": 20,
      "quotedCost": 50000,
      "actualCost": 60000,
      "costVariance": 10000,
      "costVariancePercent": 20
    },
    "byJob": [
      {
        "job": { "id": "...", "jobNumber": "E1001", "title": "..." },
        "quotedHours": 100,
        "actualHours": 120,
        "hoursVariance": 20,
        "hoursVariancePercent": 20,
        ...
      }
    ]
  }
}
```

### GET /api/analytics/profitability?year=2025
**Response:**
```json
{
  "success": true,
  "data": {
    "totals": {
      "revenue": 500000,
      "laborCost": 200000,
      "materialCost": 100000,
      "totalCost": 300000,
      "profit": 200000,
      "profitMargin": 40
    },
    "byJob": [...]
  }
}
```

### GET /api/analytics/win-loss?year=2025
**Response:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "won": 30,
    "lost": 10,
    "sent": 5,
    "draft": 5,
    "winRate": 60,
    "lossRate": 20,
    "totalQuoted": 500000,
    "wonValue": 350000,
    "lostValue": 100000,
    "avgQuoteValue": 10000,
    "avgWonValue": 11666.67,
    "byCustomer": [...]
  }
}
```

### GET /api/analytics/dashboard?year=2025
**Response:**
```json
{
  "success": true,
  "data": {
    "hoursLogged": {...},
    "quotedVsActual": {...},
    "jobProfitability": {...},
    "winLossRate": {...},
    "bomVariance": {...},
    "productivity": {...}
  }
}
```

## Filter Parameters

All endpoints support:
- `startDate` - ISO datetime string
- `endDate` - ISO datetime string
- `year` - Integer (2000-2100)
- `month` - Integer (1-12)
- `userId` - User ID (for hours, productivity)
- `jobId` - Job ID (for hours, quoted-vs-actual, bom-variance)
- `customerId` - Customer ID (for quoted-vs-actual, profitability, win-loss)

## Performance Considerations

- All calculations done server-side using Prisma
- Efficient queries with proper includes
- Aggregate calculations in memory for small datasets
- Dashboard endpoint uses Promise.all for parallel queries
- Consider pagination for large datasets in future

## Migration Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. No Database Migrations Required
This PR uses existing models - no schema changes needed.

### 3. Test Analytics Endpoints
```bash
# Get hours logged for 2025
curl http://localhost:3000/api/analytics/hours?year=2025 \
  -H "Cookie: next-auth.session-token=..."

# Get dashboard metrics
curl http://localhost:3000/api/analytics/dashboard?year=2025 \
  -H "Cookie: next-auth.session-token=..."
```

## Testing Checklist

- [ ] Get hours logged → Returns totals and breakdowns
- [ ] Get quoted vs actual → Returns variance calculations
- [ ] Get profitability → Returns profit margins
- [ ] Get win/loss rate → Returns win rate percentages
- [ ] Get BOM variance → Returns margin calculations
- [ ] Get productivity → Returns daily averages
- [ ] Get dashboard → Returns all metrics
- [ ] Filter by year → Returns correct date range
- [ ] Filter by user → Returns user-specific data
- [ ] Filter by customer → Returns customer-specific data
- [ ] Filter by job → Returns job-specific data

## Next Steps (Future PRs)

- Create analytics dashboard UI with charts (recharts)
- Add date range picker component
- Add export functionality (CSV, PDF)
- Add caching for expensive queries
- Add pagination for large result sets
- Add real-time metrics updates
- Add custom date range comparisons
- Add trend analysis (month-over-month, year-over-year)

## Notes

- All metrics calculated server-side for performance
- Consistent API response format across all endpoints
- Efficient Prisma queries with proper relations
- Dashboard endpoint optimized for single-page load
- BOM variance currently shows quoted values (actual purchase tracking in future)
- Productivity metrics show daily averages per user
- Win/loss rate includes value-based metrics
- All endpoints support flexible date filtering

