'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AttendanceView } from './attendance-view'
import { TimeView } from './time-view'
import { Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { TimesheetApprovalsView } from './timesheet-approvals-view'
import { TimeChangeApprovals } from './time-change-approvals'
import { dashboardUi } from '@/components/layout/dashboard-ui'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string | null
  email: string | null
}

interface Job {
  id: string
  jobNumber: string
  title: string
}

interface LaborCode {
  id: string
  code: string
  name: string
}

interface TimesheetMainProps {
  currentUserId: string
  currentUserName: string
  users: User[]
  jobs: Job[]
  laborCodes: LaborCode[]
  isAdmin: boolean
  /** Weekly submission approvals (admin-only) */
  canViewApprovalsTab: boolean
}

export function TimesheetMain({
  currentUserId,
  currentUserName,
  users,
  jobs,
  laborCodes,
  isAdmin,
  canViewApprovalsTab,
}: TimesheetMainProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab') || 'attendance'
  const [activeTab, setActiveTab] = useState(tabParam)

  useEffect(() => {
    const tab = searchParams.get('tab') || 'attendance'
    if (tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams, activeTab])

  useEffect(() => {
    if (!canViewApprovalsTab && activeTab === 'approvals') {
      router.replace('/dashboard/timekeeping?tab=attendance', { scroll: false })
    }
  }, [canViewApprovalsTab, activeTab, router])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/dashboard/timekeeping?tab=${value}`, { scroll: false })
  }

  const tabCount = canViewApprovalsTab ? 4 : 3

  return (
    <div className={dashboardUi.pageWrap}>
      <div className={dashboardUi.sectionGap}>
        <h1 className={dashboardUi.title}>Timesheets</h1>
        <p className={dashboardUi.description}>Manage attendance, time entries, and approvals</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          className={cn(
            dashboardUi.tabsListGrid,
            tabCount === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
            'mb-6'
          )}
        >
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Time
          </TabsTrigger>
          {canViewApprovalsTab ? (
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Approvals
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="change-requests" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Change Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-0">
          <AttendanceView
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            users={users}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="time" className="mt-0">
          <TimeView
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            users={users}
            jobs={jobs}
            laborCodes={laborCodes}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {canViewApprovalsTab ? (
          <TabsContent value="approvals" className="mt-0">
            <TimesheetApprovalsView canApproveWeekly={true} />
          </TabsContent>
        ) : null}

        <TabsContent value="change-requests" className="mt-0">
          {canViewApprovalsTab ? (
            <TimesheetApprovalsView canApproveWeekly={true} initialTab="change-requests" />
          ) : (
            <TimeChangeApprovals compact={false} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
