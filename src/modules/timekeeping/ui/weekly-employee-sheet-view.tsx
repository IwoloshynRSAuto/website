'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, eachDayOfInterval, endOfWeek } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Loader2, CalendarDays } from 'lucide-react'
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

  const weekAnchor = useMemo(() => new Date(weekStartIso), [weekStartIso])
  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: weekAnchor,
        end: endOfWeek(weekAnchor, { weekStartsOn: 0 }),
      }),
    [weekAnchor]
  )

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
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Error'
          toast({ title: 'Error', description: msg, variant: 'destructive' })
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
      : `${format(weekAnchor, 'MMM d')} – ${format(endOfWeek(weekAnchor, { weekStartsOn: 0 }), 'MMM d, yyyy')}`

  const employeeLabel = rows[0]?.user?.name || rows[0]?.user?.email || 'Employee'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/timekeeping/approvals">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to approvals
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white shadow-sm">
        <CardHeader className="space-y-4 border-b border-slate-100 bg-white/90 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted weekly sheet</p>
              <h2 className="text-xl font-semibold text-slate-900">{employeeLabel}</h2>
              <p className="text-sm text-slate-600">{labelRange}</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              <CalendarDays className="h-5 w-5 shrink-0 text-orange-600" />
              <span className="text-sm font-medium">Sun–Sat week</span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Days in this week</p>
            <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekDays.map((d) => (
                <div
                  key={d.toISOString()}
                  className="rounded-md border border-white bg-white px-1 py-2 text-center shadow-sm sm:px-2"
                >
                  <div className="text-[10px] font-semibold uppercase text-slate-500">{format(d, 'EEE')}</div>
                  <div className="text-xs font-semibold tabular-nums text-slate-900 sm:text-sm">{format(d, 'M/d')}</div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

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
            <Card key={sub.id} className="border border-slate-200 shadow-md overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-slate-50/80 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  {sub.type === 'ATTENDANCE' ? 'Attendance' : 'Job time'}
                </CardTitle>
                <Badge variant="secondary">{sub.status}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                {sub.type === 'ATTENDANCE' && (sub.timesheets?.length ?? 0) > 0 ? (
                  <div className="max-h-[min(70vh,32rem)] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={cn(dashboardUi.tableHead, 'sticky top-0 z-[1] bg-slate-50/95 shadow-sm')}>
                            Date
                          </TableHead>
                          <TableHead className={cn(dashboardUi.tableHead, 'sticky top-0 z-[1] bg-slate-50/95 shadow-sm')}>
                            Clock in
                          </TableHead>
                          <TableHead className={cn(dashboardUi.tableHead, 'sticky top-0 z-[1] bg-slate-50/95 shadow-sm')}>
                            Clock out
                          </TableHead>
                          <TableHead
                            className={cn(dashboardUi.tableHead, 'text-right sticky top-0 z-[1] bg-slate-50/95 shadow-sm')}
                          >
                            Hours
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(sub.timesheets || []).map((ts) => (
                          <TableRow key={ts.id} className="border-slate-100">
                            <TableCell className="text-sm font-medium">{format(new Date(ts.date), 'EEE MMM d')}</TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {ts.clockInTime ? format(new Date(ts.clockInTime), 'h:mm a') : '—'}
                            </TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {ts.clockOutTime ? format(new Date(ts.clockOutTime), 'h:mm a') : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-right tabular-nums">
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
                  </div>
                ) : sub.type === 'TIME' && sub.timeEntries?.length ? (
                  <div className="max-h-[min(70vh,32rem)] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={cn(dashboardUi.tableHead, 'sticky top-0 z-[1] bg-slate-50/95 shadow-sm')}>
                            Date
                          </TableHead>
                          <TableHead className={cn(dashboardUi.tableHead, 'sticky top-0 z-[1] bg-slate-50/95 shadow-sm')}>
                            Job
                          </TableHead>
                          <TableHead className={cn(dashboardUi.tableHead, 'sticky top-0 z-[1] bg-slate-50/95 shadow-sm')}>
                            Labor code
                          </TableHead>
                          <TableHead
                            className={cn(dashboardUi.tableHead, 'text-right sticky top-0 z-[1] bg-slate-50/95 shadow-sm')}
                          >
                            Reg.
                          </TableHead>
                          <TableHead
                            className={cn(dashboardUi.tableHead, 'text-right sticky top-0 z-[1] bg-slate-50/95 shadow-sm')}
                          >
                            OT
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sub.timeEntries.map((te) => (
                          <TableRow key={te.id} className="border-slate-100">
                            <TableCell className="text-sm whitespace-nowrap font-medium">
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
                            <TableCell className="text-sm text-right tabular-nums">
                              {Number(te.regularHours || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-right tabular-nums">
                              {Number(te.overtimeHours || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
