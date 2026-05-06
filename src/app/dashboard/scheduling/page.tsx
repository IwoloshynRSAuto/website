import { Suspense } from 'react'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { SchedulingApp } from './scheduling-app'

export default function SchedulingPage() {
  return (
    <DashboardPageShell
      title="Schedule"
      description="Jobs and shop resources."
      howTo={{
        title: 'Schedule — how it works',
        description: 'Use the tabs to switch between jobs and machine shop bookings.',
        content: (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Active jobs:</span> click the blue bar for a summary; use{' '}
                <span className="font-medium text-foreground">Adjust timeline dates</span> if you may edit dates (owner/admin).
              </li>
              <li>Purple strips along the bottom are deliverables—length reflects estimated effort (from quoted labor).</li>
              <li>
                <span className="font-medium text-foreground">Machine shop:</span> click an amber bar for operator and details; longer bookings draw wider
                bars.
              </li>
            </ul>
          </div>
        ),
      }}
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground py-8">Loading schedule…</div>}>
        <SchedulingApp initialTab="portfolio" />
      </Suspense>
    </DashboardPageShell>
  )
}
