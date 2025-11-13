'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Clock, FileText } from 'lucide-react'
import { AttendanceApprovals } from './attendance-approvals'
import { TimeApprovals } from './time-approvals'

export function ApprovalsView() {
  const [activeTab, setActiveTab] = useState('attendance')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="attendance" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-semibold"
              >
                <Clock className="h-4 w-4" />
                Attendance Approvals
              </TabsTrigger>
              <TabsTrigger 
                value="time" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-semibold"
              >
                <FileText className="h-4 w-4" />
                Time Approvals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="mt-0">
              <AttendanceApprovals />
            </TabsContent>

            <TabsContent value="time" className="mt-0">
              <TimeApprovals />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}





