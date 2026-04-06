'use client'

import { Suspense } from 'react'
import { TimesheetMain } from './timesheet-main'

interface TimesheetMainWrapperProps {
  currentUserId: string
  currentUserName: string
  users: Array<{ id: string; name: string | null; email: string | null }>
  jobs: Array<{ id: string; jobNumber: string; title: string }>
  laborCodes: Array<{ id: string; code: string; name: string }>
  isAdmin: boolean
  canViewApprovalsTab: boolean
}

export function TimesheetMainWrapper(props: TimesheetMainWrapperProps) {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <TimesheetMain {...props} />
    </Suspense>
  )
}


