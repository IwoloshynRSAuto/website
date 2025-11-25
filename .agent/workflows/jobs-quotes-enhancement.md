---
description: Jobs/Quotes Enhancement - Labor Drill-Down, Excel Export, Kanban Board
---

# Jobs/Quotes Enhancement Implementation Plan

## Overview
This plan implements 8 major enhancements to the Jobs/Quotes system to achieve complete feature parity and add new functionality.

## Status Summary
- ✅ **Item 3**: Quotes spreadsheet matches Jobs (COMPLETED in previous work)
- ✅ **Item 4**: Quote detail page routing fixed (COMPLETED in previous work)
- ✅ **Item 5**: Quote detail page matches Job detail page (COMPLETED in previous work)
- 🔄 **Items 1, 2, 6**: Need implementation

---

## 1. Labor Code Drill-Down Functionality

### Database Schema
No changes needed - existing `TimeEntry` table has all required fields.

### Components to Create
1. **`/components/jobs/labor-code-drill-down-modal.tsx`**
   - Modal/drawer component
   - Two tabs: "Labor Code Hours" and "All Job Hours"
   - Data table with columns: Employee, Hours, Date Worked, Date Submitted, Notes, Approval Status
   - Total hours summary
   - Pagination support

### API Endpoints to Create
1. **`/app/api/jobs/[id]/labor-codes/[laborCodeId]/hours/route.ts`**
   - GET: Fetch all time entries for specific labor code on a job
   - Returns: employee name, hours, dates, notes, approval status

2. **`/app/api/quotes/[id]/labor-codes/[laborCodeId]/hours/route.ts`**
   - Same as above for quotes

### Integration Points
- Update `JobDetailsClient` component to make labor codes clickable
- Add onClick handler to labor code rows in the Labor Tracking table
- Open modal on click

---

## 2. Excel Export Functionality

### Dependencies
```bash
npm install exceljs
```

### API Endpoints to Create
1. **`/app/api/jobs/[id]/labor-codes/[laborCodeId]/export/route.ts`**
   - GET: Generate Excel file for specific labor code
   - Filename: `job_<jobNumber>_labor_<laborCode>.xlsx`

2. **`/app/api/jobs/[id]/hours/export/route.ts`**
   - GET: Generate Excel file for all job hours
   - Filename: `job_<jobNumber>_all_hours.xlsx`

3. **Same for quotes** (replace `/jobs/` with `/quotes/`)

### Excel File Structure
- Headers: Employee Name, Hours Worked, Date Worked, Date Submitted, Notes, Approval Status
- Auto-width columns
- Total row at bottom
- Professional formatting

### Integration
- Add "Export to Excel" button in labor code drill-down modal
- Add "Export to Excel" button in "All Hours" tab

---

## 6. Task Kanban Board

### Database Schema Changes
Create new table: `TaskCard`

```prisma
model TaskCard {
  id          String   @id @default(cuid())
  jobId       String?
  quoteId     String?
  name        String
  description String?
  assignedToId String?
  dueDate     DateTime?
  status      String   @default("BACKLOG") // BACKLOG, IN_PROGRESS, WAITING, COMPLETED
  position    Int      @default(0) // For ordering within column
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  job         Job?     @relation(fields: [jobId], references: [id], onDelete: Cascade)
  quote       Quote?   @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  assignedTo  User?    @relation(fields: [assignedToId], references: [id])
  
  @@index([jobId])
  @@index([quoteId])
  @@index([status])
  @@map("task_cards")
}
```

### Components to Create
1. **`/components/jobs/kanban-board.tsx`**
   - Main Kanban board component
   - Columns: Backlog, In Progress, Waiting, Completed
   - Drag-and-drop functionality using `@dnd-kit/core`
   - Task cards with: name, assignee, description, due date
   - Add task button
   - Modern, clean styling

2. **`/components/jobs/task-card.tsx`**
   - Individual task card component
   - Editable inline or via modal
   - Delete functionality

3. **`/components/jobs/add-task-modal.tsx`**
   - Form to create new task
   - Fields: name, description, assignedTo, dueDate, status

### API Endpoints to Create
1. **`/app/api/jobs/[id]/tasks/route.ts`**
   - GET: Fetch all tasks for job
   - POST: Create new task

2. **`/app/api/jobs/[id]/tasks/[taskId]/route.ts`**
   - PATCH: Update task (including status/position for drag-drop)
   - DELETE: Delete task

3. **Same for quotes**

### Dependencies
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Integration Points
- Add Kanban board component ABOVE Deliverables section in `JobDetailsClient`
- Pass `jobId` or `quoteId` and `jobType` props
- Fetch tasks on component mount
- Update task status/position on drag-drop

---

## Implementation Order

### Phase 1: Database & Schema (30 min)
1. Add `TaskCard` model to Prisma schema
2. Update `Job` and `Quote` models with `tasks` relation
3. Run `npx prisma db push`
4. Run `npx prisma generate`

### Phase 2: Kanban Board (2-3 hours)
1. Install `@dnd-kit` dependencies
2. Create `kanban-board.tsx` component
3. Create `task-card.tsx` component
4. Create `add-task-modal.tsx` component
5. Create API routes for tasks (jobs and quotes)
6. Integrate into `JobDetailsClient` above Deliverables
7. Test drag-drop functionality

### Phase 3: Labor Code Drill-Down (1-2 hours)
1. Create `labor-code-drill-down-modal.tsx`
2. Create API routes for labor code hours
3. Make labor codes clickable in Labor Tracking table
4. Test modal with real data

### Phase 4: Excel Export (1-2 hours)
1. Install `exceljs`
2. Create export API routes (4 total: jobs/quotes × labor/all)
3. Add export buttons to drill-down modal
4. Test Excel file generation and download

### Phase 5: Testing & Polish (1 hour)
1. Test all features in both Jobs and Quotes
2. Verify permissions
3. Check responsive design
4. Ensure no broken functionality

---

## Files to Create/Modify

### New Files
- `/components/jobs/kanban-board.tsx`
- `/components/jobs/task-card.tsx`
- `/components/jobs/add-task-modal.tsx`
- `/components/jobs/labor-code-drill-down-modal.tsx`
- `/app/api/jobs/[id]/tasks/route.ts`
- `/app/api/jobs/[id]/tasks/[taskId]/route.ts`
- `/app/api/quotes/[id]/tasks/route.ts`
- `/app/api/quotes/[id]/tasks/[taskId]/route.ts`
- `/app/api/jobs/[id]/labor-codes/[laborCodeId]/hours/route.ts`
- `/app/api/jobs/[id]/labor-codes/[laborCodeId]/export/route.ts`
- `/app/api/jobs/[id]/hours/export/route.ts`
- `/app/api/quotes/[id]/labor-codes/[laborCodeId]/hours/route.ts`
- `/app/api/quotes/[id]/labor-codes/[laborCodeId]/export/route.ts`
- `/app/api/quotes/[id]/hours/export/route.ts`

### Files to Modify
- `/prisma/schema.prisma` - Add TaskCard model
- `/app/dashboard/jobs/[id]/job-details-client.tsx` - Add Kanban board, make labor codes clickable
- `/package.json` - Add dependencies

---

## Notes
- All features work identically for Jobs and Quotes
- Reuse components wherever possible
- Follow existing UI patterns and styling
- Maintain permission logic
- No TODO markers - complete implementation only
