'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WeeklyApprovalsDashboard } from '@modules/timekeeping/ui/weekly-approvals-dashboard'
import { TimeChangeApprovals } from './time-change-approvals'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dashboardUi } from '@/components/layout/dashboard-ui'

interface TimesheetApprovalsViewProps {
  canApproveWeekly: boolean
  initialTab?: 'weekly' | 'change-requests'
}

export function TimesheetApprovalsView({
  canApproveWeekly,
  initialTab = 'weekly',
}: TimesheetApprovalsViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab)

  if (!canApproveWeekly) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">You do not have permission to view approvals.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'weekly' | 'change-requests')} className="w-full">
        <TabsList className={cn(dashboardUi.tabsListGrid, 'grid-cols-2 mb-6')}>
          <TabsTrigger
            value="weekly"
            className={cn(
              'group gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium transition-all',
              'text-slate-600 hover:bg-white/70 hover:text-slate-900',
              'data-[state=active]:border-amber-200 data-[state=active]:bg-white data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-amber-400/40'
            )}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
            Weekly approvals
          </TabsTrigger>
          <TabsTrigger
            value="change-requests"
            className={cn(
              'group gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium transition-all',
              'text-slate-600 hover:bg-white/70 hover:text-slate-900',
              'data-[state=active]:border-rose-200 data-[state=active]:bg-white data-[state=active]:text-rose-950 data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-rose-400/40'
            )}
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            Change requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-0">
          <WeeklyApprovalsDashboard />
        </TabsContent>

        <TabsContent value="change-requests" className="mt-0">
          <TimeChangeApprovals compact={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
