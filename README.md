# Timekeeping Portal

A simplified web application focused on core timekeeping and job management features.

## Features

### Employee Management
- Create, edit, and remove employees
- View list of all employees
- Link employees to their time sheets and jobs

### Job Management
- Create, edit, and remove job listings
- Each job has a unique Job Code
- Associate employees and time sheets with specific jobs

### Time Sheet System
- Create time sheets for specific jobs and employees
- Time sheets are editable even after approval
- Time sheets can be deleted if needed
- Include fields for start time, end time, total hours, and approval status

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database:
   ```bash
   npm run db:push
   ```

3. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The app uses a simplified schema with these core models:

- **User** (Employees) - Employee information and authentication
- **Job** - Job listings and management
- **TimeEntry** - Individual time entries
- **TimesheetSubmission** - Weekly timesheet submissions
- **LaborCode** - Job codes for categorization

## Navigation

The app has a simple navigation structure:
- **Dashboard** - Overview of jobs and timekeeping stats
- **Jobs** - Job management
- **Time Sheets** - Time tracking and timesheet management
- **Admin** - Employee management, labor codes, and timesheet approvals

## Development

- Run linting: `npm run lint`
- View database: `npm run db:studio`
- Build for production: `npm run build`

