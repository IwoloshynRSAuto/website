# Testing Checklist for Jobs/Quotes System

## ✅ Pre-Testing Setup

- [ ] Database has been migrated (schema includes type, relatedQuoteId, convertedAt)
- [ ] Prisma client has been regenerated
- [ ] Development server is running
- [ ] Browser console is open for debugging

## 🧪 Test Suite

### Test 1: Create a Quote
**Steps:**
1. Navigate to Jobs page (`/dashboard/jobs`)
2. Click "New Job/Quote" button
3. Verify modal title says "Create New Job / Quote"
4. Verify "Quote" is selected by default (blue border)
5. Note the auto-generated number starts with `Q`
6. Fill in:
   - Customer: (select any)
   - Title: "Test Quote - Conveyor System"
   - Description: "Testing quote creation"
   - Amount: 15000
7. Verify Start Date and End Date fields are **NOT visible**
8. Click "Create Quote"

**Expected Results:**
- ✅ Success toast: "Quote created successfully"
- ✅ Modal closes
- ✅ New quote appears in table with blue "Quote" badge
- ✅ Job number is Q#### format

---

### Test 2: Create a Job
**Steps:**
1. Click "New Job/Quote" button
2. Click on "Job" type selector (green option)
3. Verify border changes to green
4. Note the auto-generated number starts with `E`
5. Fill in:
   - Customer: (select any)
   - Title: "Test Job - Installation"
   - Description: "Testing job creation"
   - Amount: 25000
   - Start Date: (today's date)
   - End Date: (future date)
6. Verify Start Date and End Date fields **ARE visible**
7. Click "Create Job"

**Expected Results:**
- ✅ Success toast: "Job created successfully"
- ✅ Modal closes
- ✅ New job appears in table with green "Job" badge
- ✅ Job number is E#### format
- ✅ Start date is displayed

---

### Test 3: Auto-Increment Job Numbers
**Steps:**
1. Note the last Quote number (e.g., Q1005)
2. Create a new Quote
3. Verify new number is Q1006 (last + 1)
4. Note the last Job number (e.g., E1003)
5. Create a new Job
6. Verify new number is E1004 (last + 1)

**Expected Results:**
- ✅ Quote numbers increment independently
- ✅ Job numbers increment independently
- ✅ No conflicts between Q and E prefixes

---

### Test 4: Convert Quote to Job
**Steps:**
1. Find a Quote in the table (blue badge)
2. Note its number (e.g., Q1002)
3. Click the "Upgrade" button in Actions column
4. Verify confirmation dialog appears
5. Confirm the conversion
6. Wait for success message

**Expected Results:**
- ✅ Success toast: "Quote successfully converted to job E####"
- ✅ Page refreshes
- ✅ New Job appears with E prefix (e.g., E1002)
- ✅ New Job shows "From Q1002" in Actions column
- ✅ Original Quote (Q1002) still exists unchanged
- ✅ Both records visible in table

---

### Test 5: Prevent Duplicate Conversion
**Steps:**
1. Find a Quote that was already converted (check for a Job with "From Q####")
2. Try to click "Upgrade" on that Quote again
3. Confirm the conversion attempt

**Expected Results:**
- ✅ Error toast: "This quote has already been converted to a job"
- ✅ No duplicate Job created
- ✅ Original conversion remains intact

---

### Test 6: Table Filtering
**Steps:**
1. Use Status filter dropdown
2. Select "Quote"
3. Verify only blue "Quote" badges are shown
4. Select "Active"
5. Verify only active jobs are shown
6. Select "All Status"
7. Verify all records are shown

**Expected Results:**
- ✅ Filters work correctly
- ✅ Type badges remain accurate
- ✅ Count shown at bottom updates

---

### Test 7: Search Functionality
**Steps:**
1. In search box, type a Quote number (e.g., "Q1002")
2. Verify only that quote appears
3. Clear search
4. Type a Job number (e.g., "E1001")
5. Verify only that job appears
6. Clear search
7. Type part of a title
8. Verify matching records appear

**Expected Results:**
- ✅ Search works for Q and E numbers
- ✅ Search works for titles
- ✅ Results update in real-time
- ✅ Type badges remain correct

---

### Test 8: Dashboard Stats
**Steps:**
1. Navigate to Jobs page
2. Note the stat cards at the top
3. Count actual Jobs (E prefix) in table
4. Verify "Active Jobs" stat matches
5. Count actual Quotes (Q prefix) in table
6. Verify "Pending Quotes" stat matches

**Expected Results:**
- ✅ "Active Jobs" shows count of Jobs only
- ✅ "Pending Quotes" shows count of Quotes only
- ✅ Stats update after creating/converting
- ✅ Colors match (green for jobs, blue for quotes)

---

### Test 9: Row Click Navigation
**Steps:**
1. Click on any Quote row (not the Upgrade button)
2. Verify it opens the detail page
3. Go back to Jobs table
4. Click on any Job row
5. Verify it opens the detail page

**Expected Results:**
- ✅ Row clicks navigate to detail page
- ✅ Upgrade button click does NOT navigate (stops propagation)
- ✅ Detail page shows correct information

---

### Test 10: Modal Type Toggle
**Steps:**
1. Open "New Job/Quote" modal
2. Select "Quote" - note the job number (Q####)
3. Click "Job" type - verify number changes to E####
4. Click back to "Quote" - verify number changes to Q####
5. Switch back and forth several times

**Expected Results:**
- ✅ Job number updates immediately on type change
- ✅ Date fields show/hide appropriately
- ✅ No errors in console
- ✅ Numbers are always accurate

---

### Test 11: Export Functionality
**Steps:**
1. Click "Export" button
2. Open the downloaded CSV
3. Verify it includes both Quotes and Jobs
4. Check that Type column exists (if added to export)

**Expected Results:**
- ✅ CSV downloads successfully
- ✅ Contains all visible records
- ✅ Format is correct

---

### Test 12: Data Persistence
**Steps:**
1. Create a Quote (Q1010)
2. Refresh the page
3. Verify Quote still exists
4. Convert it to a Job (E1010)
5. Refresh the page
6. Verify both Q1010 and E1010 exist
7. Check E1010 still shows "From Q1010"

**Expected Results:**
- ✅ All data persists across refreshes
- ✅ Conversion relationship is maintained
- ✅ No data loss

---

## 🔍 Edge Cases to Test

### Edge Case 1: First Quote Ever
- [ ] Delete all quotes (if in dev environment)
- [ ] Create a new quote
- [ ] Verify it gets Q1001 (or configured starting number)

### Edge Case 2: First Job Ever
- [ ] Delete all jobs (if in dev environment)
- [ ] Create a new job
- [ ] Verify it gets E1001 (or configured starting number)

### Edge Case 3: Gaps in Numbering
- [ ] Delete Q1005 (if it exists)
- [ ] Create a new quote
- [ ] Verify it gets Q1006 (continues from highest, not fills gap)

### Edge Case 4: Same Title Different Types
- [ ] Create Quote titled "Project X"
- [ ] Create Job titled "Project X"
- [ ] Verify both can exist with same title
- [ ] Verify they have different numbers (Q vs E)

### Edge Case 5: Long Titles
- [ ] Create a quote with a very long title (100+ characters)
- [ ] Verify it displays correctly in table
- [ ] Verify it saves correctly

### Edge Case 6: Missing Customer
- [ ] Try to create a quote without selecting a customer
- [ ] Verify validation prevents submission

---

## 🐛 Common Issues to Watch For

**Issue**: Numbers don't auto-increment
- Check browser console for API errors
- Verify `/api/jobs` endpoint returns all records

**Issue**: Conversion fails
- Check if quote has already been converted
- Verify `/api/jobs/convert-quote/[id]` endpoint exists

**Issue**: Type badges don't show
- Verify `type` field exists in database
- Check Prisma client is regenerated

**Issue**: Date fields always visible
- Check conditional rendering in create-job-dialog.tsx
- Verify `recordType` state is working

**Issue**: "Upgrade" button missing
- Verify `ArrowUpCircle` icon is imported
- Check job.type === 'QUOTE' condition

---

## 📊 Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ All UI elements visible and styled correctly
- ✅ Data persists correctly
- ✅ Conversion works reliably
- ✅ Auto-increment works for both types
- ✅ Filters work correctly
- ✅ Search works correctly

---

## 📝 Test Results

**Date Tested**: _______________  
**Tested By**: _______________  
**Pass/Fail**: _______________  

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Issues Found**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

