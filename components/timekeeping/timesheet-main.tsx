'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AttendanceView } from './attendance-view'
import { TimeView } from './time-view'
import { Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { TimesheetApprovalsView } from './timesheet-approvals-view'

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
}

export function TimesheetMain({
  currentUserId,
  currentUserName,
  users,
  jobs,
  laborCodes,
  isAdmin
}: TimesheetMainProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab') || 'attendance'
  const [activeTab, setActiveTab] = useState(tabParam)

  // Sync tab with URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab') || 'attendance'
    if (tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams, activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/dashboard/timekeeping?tab=${value}`, { scroll: false })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Timesheets</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage attendance, time entries, and approvals</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Time
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approvals
          </TabsTrigger>
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

        <TabsContent value="approvals" className="mt-0">
          <TimesheetApprovalsView isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="change-requests" className="mt-0">
          <TimesheetApprovalsView isAdmin={isAdmin} initialTab="change-requests" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

