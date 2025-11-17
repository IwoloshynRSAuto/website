'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Clock, FileText, CheckCircle2 } from 'lucide-react'
import { AttendanceView } from './attendance-view'
import { TimeView } from './time-view'
import { ApprovalsView } from './approvals-view'

interface TimesheetMainViewProps {
  currentUserId: string
  currentUserName: string
  users: Array<{ id: string; name: string | null; email: string | null }>
  jobs: Array<{ id: string; jobNumber: string; title: string }>
  laborCodes: Array<{ id: string; code: string; name: string }>
  isAdmin: boolean
}

export function TimesheetMainView({
  currentUserId,
  currentUserName,
  users,
  jobs,
  laborCodes,
  isAdmin
}: TimesheetMainViewProps) {
  const [activeTab, setActiveTab] = useState('attendance')

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 mb-6 h-12 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="attendance" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-semibold"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
            <span className="sm:hidden">Clock</span>
          </TabsTrigger>
          <TabsTrigger 
            value="time" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-semibold"
          >
            <FileText className="h-4 w-4" />
            Time
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger 
              value="approvals" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-semibold"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Approvals</span>
              <span className="sm:hidden">Approve</span>
            </TabsTrigger>
          )}
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

        {isAdmin && (
          <TabsContent value="approvals" className="mt-0">
            <ApprovalsView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}






