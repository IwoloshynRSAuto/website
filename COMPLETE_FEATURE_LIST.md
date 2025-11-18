# Complete Feature List - Timekeeping Portal

## Overview
A comprehensive business management platform for automation companies that handles time tracking, project management, quoting, parts inventory, vendor relationships, and employee administration.

---

## 1. TIMESHEETS MODULE

### 1.1 Attendance (Clock In/Out)
- **Clock In Now** - One-click clock in with geolocation capture
- **Clock Out Now** - One-click clock out with geolocation capture
- **Geolocation Tracking** - Automatic capture of latitude, longitude, and accuracy on clock in/out
- **Day/Week/Month Views** - Multiple calendar views for viewing attendance history
- **Weekly Submission** - Submit attendance entries for approval
- **Change Requests** - Request corrections to past attendance entries
- **Attendance Locations** - Admin view of all clock-in/out locations on a map
- **Status Tracking** - Track submission status (DRAFT, SUBMITTED, APPROVED, REJECTED)

**Key Files:**
- `components/timekeeping/attendance-view.tsx`
- `components/timekeeping/punch-in-out-timesheet.tsx`
- `app/api/timesheets/route.ts`
- `app/dashboard/timekeeping/locations/page.tsx`

### 1.2 Time (Job Time Entries)
- **Job-Specific Time Tracking** - Track hours worked on specific jobs/projects
- **Labor Code Assignment** - Assign labor codes to time entries
- **Day/Week/Month Views** - Multiple calendar views for time entries
- **Editable Entries** - Edit time entries before submission
- **Weekly Submission** - Submit time entries for approval
- **Notes Field** - Add notes to time entries
- **Billable Hours Tracking** - Mark entries as billable or non-billable

**Key Files:**
- `components/timekeeping/time-view.tsx`
- `components/timekeeping/time-entry-modal.tsx`
- `app/api/timesheet-submissions/route.ts`

### 1.3 Approvals
- **Attendance Approvals** - Approve/reject attendance submissions
- **Time Approvals** - Approve/reject job time entry submissions
- **Change Request Approvals** - Approve/reject attendance change requests
- **Combined View** - View all pending approvals in one place
- **Rejection Reasons** - Provide reasons when rejecting submissions
- **Audit Trail** - Track who approved/rejected and when

**Key Files:**
- `components/timekeeping/timesheet-approvals-view.tsx`
- `components/timekeeping/attendance-approvals.tsx`
- `components/timekeeping/time-approvals.tsx`
- `components/timekeeping/time-change-approvals.tsx`

### 1.4 Change Requests
- **Request Attendance Changes** - Request corrections to clock-in/out times
- **Reason Field** - Provide reason for change request
- **Optional Manual Times** - Specify requested clock-in/out times
- **Status Tracking** - Track request status (PENDING, APPROVED, REJECTED)

**Key Files:**
- `components/timekeeping/time-entry-modal.tsx`
- `app/api/time-change-requests/route.ts`

---

## 2. JOBS / PROJECTS MODULE

### 2.1 Job Management
- **Create/Edit Jobs** - Full CRUD operations for jobs
- **Job Numbers** - Unique job number assignment
- **Job Status** - Track job status (DRAFT, IN_PROGRESS, COMPLETED, etc.)
- **Job Types** - Support for JOB and QUOTE types
- **Customer Assignment** - Link jobs to customers
- **Employee Assignment** - Assign jobs to employees
- **Job Description** - Detailed job descriptions and notes

**Key Files:**
- `app/dashboard/jobs/page.tsx`
- `app/api/jobs/route.ts`

### 2.2 Job Tracking
- **Milestone Management** - Track job milestones (Engineering, Panel Build, FAT, SAT, Commissioning)
- **Gantt View** - Visual timeline view of job milestones
- **Deliverables** - Track job deliverables with templates
- **Change Orders** - Track engineering change orders (ECO)
- **Billing Milestones** - Set up billing milestones and invoice triggers
- **Labor Estimates** - Track estimated vs actual labor hours by discipline

**Key Files:**
- `app/dashboard/jobs/[id]/page.tsx`
- `components/jobs/job-details.tsx`

### 2.3 Cost Tracking
- **Labor Cost Tracking** - Track actual labor costs vs estimates
- **BOM Cost Tracking** - Track bill of materials costs
- **Vendor Costs** - Track vendor purchase orders
- **Job Profitability** - Calculate job profitability metrics

**Key Files:**
- `app/dashboard/jobs/[id]/page.tsx`
- `lib/metrics/job-metrics.ts`

---

## 3. QUOTES MODULE

### 3.1 Quote Management
- **Create/Edit Quotes** - Full CRUD operations for quotes
- **Quote Numbers** - Unique quote number assignment
- **Quote Status** - Track quote status (DRAFT, SENT, WON, LOST)
- **Customer Linking** - Link quotes to customers
- **Valid Until Date** - Set quote expiration dates
- **Quote Types** - Support for PROJECT and PART_SALE quotes

**Key Files:**
- `app/dashboard/jobs/page.tsx` (quotes shown alongside jobs)
- `app/api/quotes/route.ts`

### 3.2 Quote Features
- **BOM Integration** - Link bill of materials to quotes
- **Labor Estimates** - Estimate labor hours by discipline
- **Revision Control** - Track quote revisions
- **PDF Export** - Export quotes to PDF
- **Aging Alerts** - Alerts for aging/expired quotes
- **Lost Quote Reasons** - Track reasons for lost quotes

**Key Files:**
- `lib/pdf/quote-pdf.ts`
- `app/api/quotes/[id]/export/route.ts`
- `lib/quotes/service.ts`

---

## 4. PARTS MODULE

### 4.1 Parts Database
- **Parts Management** - Full CRUD operations for parts
- **Part Search** - Search parts by name, number, brand, vendor
- **Filters** - Filter by vendor, brand, category, in-stock status
- **Sorting** - Sort by name, price, vendor, brand, date added
- **Price History** - Track price history per part/vendor
- **Lead Time Tracking** - Track lead times for parts
- **Brand Lookup** - Search parts by brand

**Key Files:**
- `app/dashboard/parts/database/page.tsx`
- `components/parts/parts-database-view.tsx`
- `app/api/parts/route.ts`

### 4.2 Vendor Insights
- **Annual Spend Tracking** - Track annual spend per vendor
- **Parts Ordered** - Count total parts ordered per vendor
- **Price History** - View price history charts per part/vendor
- **Vendor Contact Info** - Store and display vendor contact information
- **Source Indicators** - Show if vendor is primary or secondary source

**Key Files:**
- `app/api/parts/vendor-insights/route.ts`
- `app/api/parts/price-history/[partId]/route.ts`

### 4.3 Packages & Assemblies
- **Create Packages** - Group parts into packages/assemblies
- **Package Management** - Full CRUD operations for packages
- **Package Parts** - Add/remove parts from packages

**Key Files:**
- `app/dashboard/parts/packages/page.tsx`
- `app/api/packages/route.ts`

### 4.4 Bill of Materials (BOM)
- **Create BOMs** - Create bill of materials for jobs/quotes
- **BOM Management** - Full CRUD operations for BOMs
- **Vendor Filtering** - Filter BOM parts by vendor
- **BOM Status** - Track BOM part status (QUOTED, ORDERED, RECEIVED)
- **Bulk Updates** - Bulk update BOM part statuses

**Key Files:**
- `app/dashboard/parts/boms/page.tsx`
- `app/api/boms/route.ts`

### 4.5 Part Sales
- **Part Sales Quotes** - Generate quotes for part sales
- **Margin Tracking** - Track margin and markup on part sales
- **Revision History** - Track part sale quote revisions
- **Convert to Job** - Convert part sale quotes to jobs
- **PDF Export** - Export part sale quotes to PDF

**Key Files:**
- `app/dashboard/part-sales/page.tsx`
- `lib/part-sales/service.ts`

---

## 5. VENDORS MODULE

### 5.1 Vendor Management
- **Vendor Database** - Full CRUD operations for vendors
- **Contact Information** - Store vendor contact details (name, email, phone, website)
- **Vendor Metrics** - View vendor performance metrics
- **Annual Spend** - Track annual spend per vendor
- **Parts Ordered** - Count parts ordered from each vendor

**Key Files:**
- `app/dashboard/vendors/page.tsx`
- `app/api/vendors/route.ts`

### 5.2 Vendor Features
- **Price History** - Track price history per vendor/part
- **Lead Time Tracking** - Track lead times per vendor
- **Purchase Orders** - Link purchase orders to vendors
- **Vendor Part Prices** - Store vendor-specific part prices

**Key Files:**
- `lib/vendors/service.ts`
- `app/api/vendors/[id]/route.ts`

---

## 6. CUSTOMERS MODULE

### 6.1 Customer Management
- **Customer Database** - Full CRUD operations for customers
- **Contact Management** - Manage multiple contacts per customer
- **Customer Status** - Track active/inactive customers
- **Job Linking** - View all jobs linked to a customer
- **Quote Linking** - View all quotes linked to a customer

**Key Files:**
- `app/dashboard/customers/page.tsx`
- `app/api/customers/route.ts`

### 6.2 Customer Metrics
- **Hours Tracking** - Track total hours worked per customer
- **Revenue Tracking** - Track revenue per customer
- **Profitability Analysis** - Calculate profitability per customer
- **Visual Charts** - Charts for hours, revenue, and profitability
- **Top Customers** - View top customers by various metrics

**Key Files:**
- `app/dashboard/customers/[id]/page.tsx`
- `lib/metrics/customer-metrics.ts`

---

## 7. EMPLOYEE MODULE

### 7.1 Employee Self-Service
- **Personalized Home** - Customized landing page for each employee
- **Quick Actions** - Quick access to clock in/out, submit requests
- **Recent Activity** - View recent jobs, submissions, and activity
- **Notifications** - View pending approvals and alerts
- **PTO Requests** - Submit paid time off requests
- **Expense Reports** - Submit expense reports with receipts
- **Service Reports** - Submit service reports for site visits

**Key Files:**
- `components/dashboard/personalized-home.tsx`
- `app/dashboard/home/page.tsx`

### 7.2 Employee Management (Admin)
- **Employee CRUD** - Create, edit, and deactivate employees
- **Role Management** - Assign roles (ADMIN, MANAGER, USER)
- **Hierarchy Management** - Set up manager-employee relationships
- **Employee Metrics** - View employee productivity metrics
- **Labor Codes** - Manage labor codes for time tracking

**Key Files:**
- `app/dashboard/admin/employees/page.tsx`
- `app/dashboard/admin/labor-codes/page.tsx`

---

## 8. ADMIN DASHBOARD

### 8.1 Dashboard Features
- **Metrics Overview** - View key metrics and statistics
- **Timesheet Summary** - Summary of timesheet submissions
- **PTO Summary** - Summary of PTO requests
- **Expense Summary** - Summary of expense reports
- **Job Summary** - Summary of active jobs
- **Quick Access** - Quick links to approval pages

**Key Files:**
- `app/dashboard/manager/page.tsx`
- `components/dashboard/admin-dashboard.tsx`

### 8.2 Database Management
- **Export Database** - Export database to JSON
- **Import Database** - Import database from JSON
- **Clear Approvals** - Clear all approval records
- **Clear Database** - Clear entire database (with confirmation)

**Key Files:**
- `app/dashboard/manager/page.tsx`

---

## 9. METRICS & ANALYTICS

### 9.1 Employee Metrics
- **Total Hours Logged** - Track total hours per employee
- **Hours by Discipline** - Breakdown of hours by engineering discipline
- **Projects Worked On** - List of projects per employee
- **Quoted vs Actual Hours** - Compare estimated vs actual hours
- **Productivity Metrics** - Calculate productivity per employee

**Key Files:**
- `lib/metrics/employee-metrics.ts`
- `app/api/metrics/employee/route.ts`

### 9.2 Job Metrics
- **Quoted vs Actual Cost** - Compare estimated vs actual costs
- **Labor Burn-Down** - Track labor burn-down over time
- **BOM Variance** - Compare quoted vs purchased BOM costs
- **Schedule Variance** - Compare estimated vs actual timelines
- **Job Profitability** - Calculate profitability per job

**Key Files:**
- `lib/metrics/job-metrics.ts`
- `app/api/metrics/job/route.ts`

### 9.3 Quote Metrics
- **Win/Loss Rate** - Calculate quote win/loss rates
- **Profit per Job** - Calculate profit per won quote
- **Average Quote Turnaround** - Track average time to quote
- **Most/Least Profitable Job Types** - Analyze profitability by job type
- **Lost Quote Reasons** - Analyze reasons for lost quotes

**Key Files:**
- `lib/metrics/quote-metrics.ts`
- `app/api/metrics/quote/route.ts`

---

## 10. APPROVALS & REQUESTS

### 10.1 PTO Requests
- **Submit PTO Requests** - Employees can submit paid time off requests
- **PTO Approvals** - Managers can approve/reject PTO requests
- **PTO Calendar** - View PTO calendar
- **PTO Balance** - Track PTO balance per employee

**Key Files:**
- `app/dashboard/home/approvals/pto/page.tsx`
- `app/api/time-off-requests/route.ts`

### 10.2 Expense Reports
- **Submit Expense Reports** - Employees can submit expense reports
- **Receipt Upload** - Upload receipts with expense reports
- **Expense Approvals** - Managers can approve/reject expenses
- **Expense Categories** - Categorize expenses

**Key Files:**
- `app/dashboard/home/approvals/expense/page.tsx`
- `app/api/expense-reports/route.ts`

### 10.3 Service Reports
- **Submit Service Reports** - Employees can submit service reports for site visits
- **Job Linking** - Link service reports to jobs
- **Service Report Details** - Track service report details and notes

**Key Files:**
- `app/api/service-reports/route.ts`

---

## 11. AUTHENTICATION & AUTHORIZATION

### 11.1 Authentication
- **Azure AD Integration** - Single sign-on with Azure Active Directory
- **Session Management** - Secure session management with NextAuth.js
- **Role-Based Access** - Role-based access control (RBAC)

**Key Files:**
- `lib/auth/auth.ts`
- `app/api/auth/[...nextauth]/route.ts`

### 11.2 Authorization
- **Permission Checks** - Granular permission checks throughout the app
- **Admin-Only Features** - Features restricted to admin users
- **Manager Features** - Features available to managers
- **Employee Features** - Features available to all employees

**Key Files:**
- `lib/auth/authorization.ts`

---

## 12. FILE STORAGE

### 12.1 Storage Options
- **Local Storage** - Store files locally on the server
- **S3-Compatible Storage** - Support for DigitalOcean Spaces, AWS S3
- **File Upload** - Upload files (PDFs, images, documents)
- **File Download** - Download stored files

**Key Files:**
- `lib/storage/storage-service.ts`
- `app/api/storage/route.ts`

### 12.2 File Management
- **File Records** - Track file metadata in database
- **File Linking** - Link files to quotes, jobs, expenses
- **File Versioning** - Track file versions and revisions

**Key Files:**
- `lib/storage/file-record-service.ts`

---

## 13. TECHNICAL FEATURES

### 13.1 Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Component library built on Radix UI
- **Responsive Design** - Mobile-friendly responsive design

### 13.2 Backend
- **API Routes** - Next.js API routes for backend logic
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Relational database
- **Zod Validation** - Schema validation for API requests

### 13.3 Additional Features
- **PDF Generation** - Generate PDF documents (quotes, reports)
- **Geolocation** - Browser geolocation API integration
- **Audit Logging** - Track all approval actions
- **Error Handling** - Comprehensive error handling
- **Loading States** - Loading indicators throughout the app
- **Toast Notifications** - User-friendly notifications

---

## Summary

This timekeeping portal is a comprehensive business management system with:
- **13 Major Modules** covering all aspects of business operations
- **50+ Features** across timekeeping, project management, inventory, and administration
- **Role-Based Access** ensuring proper security and permissions
- **Modern Tech Stack** with Next.js, TypeScript, and PostgreSQL
- **Mobile-Responsive** design for use on any device

All features are production-ready and fully integrated with proper error handling, validation, and user feedback.


