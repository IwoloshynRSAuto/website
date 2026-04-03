# Timesheet CSV Import

This import supports transition from existing spreadsheets into the portal's job-time records.

## Endpoint

- `POST /api/timesheets/import`
- Auth required.
- Non-admin users can import only for themselves.
- Admin/manager can import for the selected employee.

## Request format

`multipart/form-data` with:

- `file`: CSV file
- `userId`: selected employee ID in UI context

## Supported CSV columns

Required:

- `date` (or `workDate`, `entryDate`)
- `jobNumber` (or `jobCode`, `job`)
- `startTime` (or `clockIn`, `punchIn`, `timeIn`)
- `endTime` (or `clockOut`, `punchOut`, `timeOut`)

Optional:

- `laborCode` (or `labor`, `code`)
- `notes` (or `note`, `description`)

## Duplicate handling

Duplicates are skipped (never overwritten).

Duplicate key:

- employee
- date
- jobNumber
- laborCode
- punchInTime
- punchOutTime

## Response summary

The API returns:

- `rowsParsed`
- `inserted`
- `skippedDuplicates`
- `rejected`
- `errors` (line-level validation/import issues)

## XLSM transition note

Current implementation imports CSV directly.
For `.xlsm` source files, export to CSV first using your existing workbook and import that CSV.

