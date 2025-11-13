# Timesheet Portal - QA Checklist

## Pre-Deployment Testing

### 1. Clock In / Clock Out Flow
- [ ] **Clock In**
  - [ ] Can clock in with current time (auto-filled)
  - [ ] Can edit clock-in time before confirming
  - [ ] Time rounds to nearest 15 minutes correctly (8:05 → 8:00, 8:23 → 8:30, 8:38 → 8:30, 8:46 → 8:45)
  - [ ] Cannot clock in if already clocked in for today
  - [ ] Cannot clock in if already clocked out for today
  - [ ] Toast notification appears on success
  - [ ] Status changes to "Active" after clock in

- [ ] **Clock Out**
  - [ ] Can clock out when clocked in
  - [ ] Time rounds to nearest 15 minutes
  - [ ] All active jobs auto-close when clocking out
  - [ ] Total hours calculated correctly
  - [ ] Status changes to "Completed" after clock out
  - [ ] Cannot clock out if not clocked in
  - [ ] Toast notification appears on success

### 2. Job Tracking Flow
- [ ] **Job Clock In**
  - [ ] Can select job from searchable dropdown
  - [ ] Can select labor code from dropdown
  - [ ] Can add optional notes
  - [ ] Cannot start job without selecting both job and labor code
  - [ ] Cannot start job if not clocked in to timesheet
  - [ ] Cannot start duplicate labor code (already active)
  - [ ] Previous active job auto-clocks out when starting new job
  - [ ] Time rounds to nearest 15 minutes
  - [ ] Active job indicator appears
  - [ ] Duration updates in real-time

- [ ] **Job Clock Out**
  - [ ] Can clock out of active job
  - [ ] Time rounds to nearest 15 minutes
  - [ ] Job duration calculated and displayed
  - [ ] Notes saved correctly
  - [ ] Active job indicator disappears
  - [ ] Toast notification shows duration

- [ ] **Job Switching**
  - [ ] Switching jobs auto-clocks out previous job
  - [ ] Previous job punch-out time = new job punch-in time
  - [ ] No duplicate labor codes on same timesheet

### 3. Timesheet Grid & Editing
- [ ] **Grid Display**
  - [ ] All timesheets visible in grid
  - [ ] Job entries grouped under timesheet
  - [ ] Daily totals displayed correctly
  - [ ] Overall total calculated correctly
  - [ ] Active jobs highlighted with badge
  - [ ] Active job rows have blue background

- [ ] **Inline Editing**
  - [ ] Can click to edit clock in time
  - [ ] Can click to edit clock out time
  - [ ] Can click to edit job punch in time
  - [ ] Can click to edit job punch out time
  - [ ] Can click to edit notes
  - [ ] Time rounds when saving edits
  - [ ] Enter key saves, Escape cancels
  - [ ] Optimistic UI updates immediately
  - [ ] Server syncs after edit

- [ ] **Filters**
  - [ ] Date range filter works (start date)
  - [ ] Date range filter works (end date)
  - [ ] Clear filters button works
  - [ ] Filtered count displays correctly
  - [ ] Overall total updates with filters

### 4. Persistence & Cross-Device
- [ ] **LocalStorage Draft**
  - [ ] Draft saves when clocked in
  - [ ] Draft restores on page reload
  - [ ] Draft clears when clocking out
  - [ ] Server data is authoritative (overrides draft if different)

- [ ] **Auto-Sync**
  - [ ] Syncs with server every 30 seconds when clocked in
  - [ ] Data consistent across devices
  - [ ] No data loss when switching devices

### 5. Validation & Edge Cases
- [ ] **Duplicate Prevention**
  - [ ] Cannot create duplicate timesheet for same date
  - [ ] Error message helpful and clear
  - [ ] Cannot add duplicate active labor code
  - [ ] Error message helpful and clear

- [ ] **Time Validation**
  - [ ] Clock out must be after clock in
  - [ ] Punch out must be after punch in
  - [ ] Error messages clear and helpful

- [ ] **Rate Limiting**
  - [ ] Cannot exceed 10 requests per minute
  - [ ] 429 error returned with helpful message
  - [ ] Rate limit resets after 1 minute

- [ ] **Completed Timesheets**
  - [ ] Cannot modify completed timesheet
  - [ ] Cannot add jobs to completed timesheet
  - [ ] Error message helpful

### 6. Mobile Responsiveness
- [ ] **Layout**
  - [ ] Clock In/Out widget stacks on mobile
  - [ ] Job panel stacks on mobile
  - [ ] Timesheet grid scrolls horizontally on mobile
  - [ ] All text readable on mobile
  - [ ] Buttons large enough for touch (44px min)

- [ ] **Touch Targets**
  - [ ] All buttons at least 44px height
  - [ ] Editable fields easy to tap
  - [ ] Proper spacing between elements

- [ ] **Visual Polish**
  - [ ] Active badges visible
  - [ ] Status indicators clear
  - [ ] Blue accents consistent
  - [ ] Total hours highlighted

### 7. Error Handling
- [ ] **Network Errors**
  - [ ] Handles network failures gracefully
  - [ ] Shows error toast notifications
  - [ ] Does not crash on errors

- [ ] **Validation Errors**
  - [ ] Shows helpful error messages
  - [ ] Does not lose user input
  - [ ] Allows retry after error

## Post-Deployment Smoke Tests

1. [ ] Clock in from production URL
2. [ ] Start a job and clock out
3. [ ] View timesheet grid
4. [ ] Edit a time entry
5. [ ] Test on mobile device
6. [ ] Test cross-device sync

## Known Limitations

- Rate limiting is in-memory (resets on server restart)
- Auto-close at 23:59 requires cron job (not implemented)
- Needs-review status can be added manually but no auto-flagging

## Rollback Plan

If issues are discovered:
1. Revert to previous git commit
2. Restart PM2 process
3. Clear Next.js cache if needed: `rm -rf .next`
4. Verify database schema is compatible







