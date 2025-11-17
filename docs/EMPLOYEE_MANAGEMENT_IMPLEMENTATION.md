# Employee Management and Metrics System - Implementation Guide

This is a comprehensive implementation guide. Due to the extensive scope, this document provides the complete structure and key code snippets. Full implementations are in separate files.

## Quick Start

1. **Update Database Schema** (Step 1)
2. **Create Backend APIs** (Step 2)  
3. **Build Frontend Components** (Step 3)
4. **Test the System** (Step 4)

---

## Step 1: Database Schema Updates

### 1.1 Update Prisma Schema

Add to `prisma/schema.prisma` in the User model (after line 18):

```prisma
managerId            String?
manager              User?                @relation("EmployeeManager", fields: [managerId], references: [id], onDelete: SetNull)
directReports        User[]               @relation("EmployeeManager")
auditLogs            AuditLog[]            @relation("AuditLogs")
```

Add at the end of the file:

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  userId        String
  action        String   // CREATE, UPDATE, DELETE, APPROVE, REJECT, SUBMIT
  resourceType  String   // USER, TIME_OFF_REQUEST, EXPENSE_REPORT, TIME_CHANGE_REQUEST
  resourceId    String?
  details       Json?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())
  user          User     @relation("AuditLogs", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([resourceType])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}

model QuoteLostReason {
  id          String   @id @default(cuid())
  quoteId     String   @unique
  reason      String   // PRICE, TIMELINE, SPECIFICATIONS, COMPETITOR, OTHER
  details     String?
  createdAt   DateTime @default(now())
  quote       Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  @@index([reason])
  @@map("quote_lost_reasons")
}
```

Add to Quote model:
```prisma
lostReason             QuoteLostReason?
```

### 1.2 Run Migration

```bash
cd /opt/timekeeping-portal
npx prisma migrate dev --name add_employee_hierarchy_and_audit
npx prisma generate
```

---

## Step 2: Backend Implementation

See separate files:
- `app/api/employees/` - Employee CRUD APIs
- `app/api/approvals/` - Approval workflow APIs  
- `lib/metrics/` - Metrics calculation services
- `lib/analytics/employee-metrics.ts` - Employee-specific metrics

---

## Step 3: Frontend Implementation

See separate component files:
- `components/employee/employee-management.tsx` - Admin employee management
- `components/employee/employee-dashboard.tsx` - Employee self-service
- `components/employee/manager-approvals.tsx` - Manager approval dashboard
- `components/metrics/` - Metrics dashboards

---

## Step 4: Testing

See `scripts/test-employee-management.js` for automated testing.

---

## Next Steps

The full implementation is provided in the following files:
1. `docs/employee-management-schema.sql` - Complete schema
2. `docs/employee-management-apis.md` - All API endpoints
3. `docs/employee-management-frontend.md` - All UI components
4. `docs/employee-management-metrics.md` - Metrics calculations
5. `scripts/setup-test-data.js` - Test data setup

