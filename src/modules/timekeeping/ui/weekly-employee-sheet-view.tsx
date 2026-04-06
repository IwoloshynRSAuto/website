'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { dashboardUi } from '@/components/layout/dashboard-ui'
import { cn } from '@/lib/utils'

type SubmissionRow = {
  id: string
  type: 'TIME' | 'ATTENDANCE'
  status: string
  weekStart: string
  weekEnd: string
  user: { id: string; name: string | null; email: string }
  timeEntries: Array<{
    id: string
    date: string
    regularHours: number
    overtimeHours: number
    job: { jobNumber: string; title: string } | null
    laborCode: { code: string; description: string | null } | null
  }>
  timesheets?: Array<{
    id: string
    date: string
    clockInTime: string | null
    clockOutTime: string | null
    totalHours: number | null
  }>
  totalHours?: number
}

export function WeeklyEmployeeSheetView({
  userId,
  weekStartIso,
}: {
  userId: string
  weekStartIso: string
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SubmissionRow[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({
          userId,
          weekStart: weekStartIso,
        })
        const res = await fetch(`/api/timesheet-submissions?${qs}`)
        const json = await res.json()
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || 'Could not load submitted sheet')
        }
        if (!cancelled) setRows(json.data || [])
      } catch (e: any) {
        if (!cancelled) {
          toast({ title: 'Error', description: e?.message, variant: 'destructive' })
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable enough; avoid refetch loops
  }, [userId, weekStartIso])

  const labelRange =
    rows.length > 0
      ? `${format(new Date(rows[0].weekStart), 'MMM d')} – ${format(new Date(rows[0].weekEnd), 'MMM d, yyyy')}`
      : format(new Date(weekStartIso), 'MMM d, yyyy')

  const employeeLabel = rows[0]?.user?.name || rows[0]?.user?.email || 'Employee'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/timekeeping/approvals">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to approvals
            </Link>
          </Button>
        </div>
      </div>

      <p className={cn(dashboardUi.description, 'font-medium text-gray-800')}>
        {employeeLabel} · {labelRange}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600 py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600 text-sm">
            No submission data for this week.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {rows.map((sub) => (
            <Card key={sub.id} className="border border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  {sub.type === 'ATTENDANCE' ? 'Attendance' : 'Job time'}
                </CardTitle>
                <Badge variant="secondary">{sub.status}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                {sub.type === 'ATTENDANCE' && (sub.timesheets?.length ?? 0) > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={dashboardUi.tableHead}>Date</TableHead>
                        <TableHead className={dashboardUi.tableHead}>Clock in</TableHead>
                        <TableHead className={dashboardUi.tableHead}>Clock out</TableHead>
                        <TableHead className={cn(dashboardUi.tableHead, 'text-right')}>Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sub.timesheets || []).map((ts) => (
                        <TableRow key={ts.id}>
                          <TableCell className="text-sm">{format(new Date(ts.date), 'EEE MMM d')}</TableCell>
                          <TableCell className="text-sm">
                            {ts.clockInTime ? format(new Date(ts.clockInTime), 'h:mm a') : '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {ts.clockOutTime ? format(new Date(ts.clockOutTime), 'h:mm a') : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            {ts.totalHours != null
                              ? Number(ts.totalHours).toFixed(2)
                              : ts.clockInTime && ts.clockOutTime
                                ? (
                                    (new Date(ts.clockOutTime).getTime() - new Date(ts.clockInTime).getTime()) /
                                    (1000 * 60 * 60)
                                  ).toFixed(2)
                                : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : sub.type === 'TIME' && sub.timeEntries?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={dashboardUi.tableHead}>Date</TableHead>
                        <TableHead className={dashboardUi.tableHead}>Job</TableHead>
                        <TableHead className={dashboardUi.tableHead}>Labor code</TableHead>
                        <TableHead className={cn(dashboardUi.tableHead, 'text-right')}>Reg.</TableHead>
                        <TableHead className={cn(dashboardUi.tableHead, 'text-right')}>OT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sub.timeEntries.map((te) => (
                        <TableRow key={te.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(te.date), 'EEE MMM d')}
                          </TableCell>
                          <TableCell className="text-sm">
                            {te.job ? (
                              <span>
                                {te.job.jobNumber} — {te.job.title}
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{te.laborCode?.code || '—'}</TableCell>
                          <TableCell className="text-sm text-right">{Number(te.regularHours || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-right">{Number(te.overtimeHours || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6 text-sm text-slate-600">
                    No line items recorded for this submission type in this week.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
