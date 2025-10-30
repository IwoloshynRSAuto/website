# Quick Start Guide: Jobs & Quotes System

## 🚀 Quick Overview

Your Jobs section now supports both **Quotes** and **Jobs** with seamless conversion between them!

## 📋 Key Features

### 1. Creating Records

**Button**: "New Job/Quote" (top right of Jobs page)

**Quote Mode** (Default)
- Auto-generates ID: `Q1001`, `Q1002`, etc.
- Best for: Proposals, estimates, potential projects
- Fields: Customer, Title, Description, Amount, Priority, Status
- Date fields are **hidden** (not needed for quotes)

**Job Mode**
- Auto-generates ID: `E1001`, `E1002`, etc.
- Best for: Active projects, confirmed work
- Fields: All quote fields **plus** Start Date, End Date
- Automatically sets start date to today

### 2. Converting Quotes to Jobs

1. Find any Quote in the table (look for blue "Quote" badge)
2. Click the **"Upgrade"** button in the Actions column
3. Confirm the conversion
4. ✨ New Job created with `E` prefix
5. Original Quote remains unchanged
6. Job shows "From Q####" to link back to quote

### 3. Visual Indicators

| Type | Badge Color | ID Format | Example |
|------|-------------|-----------|---------|
| Quote | 🔵 Blue | Q#### | Q1001 |
| Job | 🟢 Green | E#### | E1001 |

### 4. Dashboard Stats

The dashboard now shows:
- **Active Jobs**: Count of jobs (E prefixes)
- **Pending Quotes**: Count of quotes (Q prefixes)
- **Completed**: All completed records
- **Total Hours**: Sum of estimated hours

## 🎯 Common Workflows

### Workflow 1: Quote → Job
```
1. Create Quote (Q1001) for "Conveyor System"
2. Customer approves
3. Click "Upgrade" button
4. New Job (E1001) created
5. Start work on E1001
6. Q1001 remains for records
```

### Workflow 2: Direct Job Creation
```
1. Click "New Job/Quote"
2. Select "Job" type
3. Fill in details + dates
4. Job (E1001) created immediately
5. Start tracking time
```

### Workflow 3: Multiple Quotes per Customer
```
1. Create Q1001 - "Option A: Basic System"
2. Create Q1002 - "Option B: Premium System"
3. Customer selects Option B
4. Upgrade Q1002 to E1001
5. Both quotes remain for comparison
```

## 🔍 Finding Records

### Filter by Type
Use the Status dropdown to filter:
- **All Status**: Shows everything
- **Quote**: Shows only quotes
- **Active**: Shows only active jobs
- **Completed**: Shows completed jobs/quotes

### Search
Search box searches across:
- Job Numbers (Q1001, E1001)
- Titles
- Assigned contacts
- Customer names

## 💡 Pro Tips

1. **Always create Quotes first** for new customer inquiries
2. **Convert to Job** only when work is confirmed
3. **Both records are preserved** - never deleted
4. **Link is maintained** - Jobs show which Quote they came from
5. **Auto-numbering** handles everything - no manual entry needed

## 📊 Table Columns Explained

| Column | Description |
|--------|-------------|
| Type | Quote or Job badge |
| Job # | Q#### or E#### |
| Title | Project name |
| Customer | Company/client name |
| Contact | Assigned person |
| Status | QUOTE, ACTIVE, COMPLETED, etc. |
| Amount | Estimated/quoted cost |
| QB/LDrive | QuickBooks & L Drive tracking |
| Invoiced | Percentage invoiced |
| Start Date | When work begins |
| Tasks | Time entries count |
| Actions | Upgrade button (quotes only) |

## ⚠️ Important Notes

- **Job numbers are unique** - cannot be duplicated
- **Quotes can only be upgraded once** - prevents duplicates
- **Original quotes never change** - conversion creates new record
- **Dates are optional for quotes** - only required for jobs
- **All records are preserved** - no automatic deletion

## 🎨 Color Coding

- 🔵 **Blue Badge** = Quote (Q prefix)
- 🟢 **Green Badge** = Job (E prefix)
- 🔼 **Upgrade Icon** = Convert quote to job
- 🔗 **"From Q####"** = This job was converted from a quote

## 📞 Support

If you need to:
- Change a job number: Edit before saving
- Delete a record: Use the delete option (admin only)
- View conversion history: Check the "From Q####" label
- Track original quote: Click on the quote number in the label

---

**Remember**: The system is designed to preserve history and maintain links between quotes and jobs for complete project tracking!

