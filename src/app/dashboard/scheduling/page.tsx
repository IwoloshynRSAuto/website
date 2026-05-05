import { Suspense } from 'react'
import { dashboardUi } from '@/components/layout/dashboard-ui'
import { SchedulingApp } from './scheduling-app'

export default function SchedulingPage() {
  return (
    <div className={dashboardUi.pageWrap}>
      <Suspense fallback={<div className="text-sm text-muted-foreground py-8">Loading schedule…</div>}>
        <SchedulingApp />
      </Suspense>
    </div>
  )
}
