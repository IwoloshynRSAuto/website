# File Map (Simplified Timekeeping Focus)

## Core Runtime Areas

- `app/api/auth/[...nextauth]/route.ts`: auth endpoint wiring.
- `lib/auth.ts`: NextAuth provider/callback rules.
- `app/dashboard/timesheets/attendance/page.tsx`: attendance entry page.
- `app/dashboard/timesheets/time/page.tsx`: job-time tracking page.
- `components/timekeeping/attendance-view.tsx`: attendance UI + workflows.
- `components/timekeeping/time-view.tsx`: job-time UI + workflows, including CSV import trigger.
- `app/api/timesheets/route.ts`: create/list timesheets.
- `app/api/timesheets/[id]/route.ts`: read/update/delete timesheet.
- `app/api/timesheets/import/route.ts`: CSV import endpoint for transition migration.

## Supporting Data/Models

- `prisma/schema.prisma`: source of truth for `Timesheet`, `JobEntry`, and related models.
- `lib/utils/time-rounding.ts`: shared time normalization and hour calculations.

## Navigation Surface (Current Target)

- `components/layout/sidebar.tsx`: only Home + Timesheets (Attendance/Time).
- `app/dashboard/home/page.tsx`: redirects directly to attendance.

## Deprioritized During Simplification

- Geolocation-specific flows are intentionally disabled.
- Non-timekeeping modules remain in repo history but are not part of the active navigation surface for this phase.

