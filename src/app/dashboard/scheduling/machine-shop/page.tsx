import { Suspense } from 'react'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { SchedulingApp } from '../scheduling-app'

export default function SchedulingMachineShopPage() {
  return (
    <DashboardPageShell
      title="Machine shop schedule"
      description="Book shop time to jobs, filter by operator, and review the machine timeline."
      howTo={{
        title: 'Machine shop schedule — how it works',
        description: 'Pick a machine, job, and window; bookings appear as bars sized by start/end.',
        content: (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Use <span className="font-medium text-foreground">Book machine time</span> to create a reservation (optional operator).
              </li>
              <li>
                Bar <span className="font-medium text-foreground">width</span> reflects booking duration—short windows stay narrow; long runs stretch.
              </li>
              <li>
                <span className="font-medium text-foreground">Click a bar</span> for machine, operator, times, and a link to the job.
              </li>
              <li>
                Edit machine rows under <span className="font-medium text-foreground">Admin → Machine shop</span>.
              </li>
            </ul>
          </div>
        ),
      }}
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground py-8">Loading machine shop…</div>}>
        <SchedulingApp initialTab="machines" />
      </Suspense>
    </DashboardPageShell>
  )
}
