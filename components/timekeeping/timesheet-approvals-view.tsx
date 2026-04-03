'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AttendanceApprovals } from './attendance-approvals'
import { TimeApprovals } from './time-approvals'
import { TimeChangeApprovals } from './time-change-approvals'
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react'

interface TimesheetApprovalsViewProps {
  isAdmin: boolean
  initialTab?: string
}

export function TimesheetApprovalsView({ isAdmin, initialTab = 'attendance' }: TimesheetApprovalsViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">You do not have permission to view approvals.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 gap-2 bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="attendance" 
            className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 active:bg-orange-100 font-bold text-gray-800 hover:text-orange-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            Attendance Approvals
          </TabsTrigger>
          <TabsTrigger 
            value="time" 
            className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 active:bg-orange-100 font-bold text-gray-800 hover:text-orange-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600"
          >
            <FileText className="h-4 w-4" />
            Time Approvals
          </TabsTrigger>
          <TabsTrigger 
            value="change-requests" 
            className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 active:bg-orange-100 font-bold text-gray-800 hover:text-orange-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600"
          >
            <AlertCircle className="h-4 w-4" />
            Change Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-0">
          <AttendanceApprovals currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="time" className="mt-0">
          <TimeApprovals currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="change-requests" className="mt-0">
          <TimeChangeApprovals compact={false} />
        </TabsContent>

      </Tabs>
    </div>
  )
}

