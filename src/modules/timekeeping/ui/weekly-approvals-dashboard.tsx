'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  endOfWeek as endOfWeekFn,
  isSameDay,
} from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Check, X, CalendarRange, ExternalLink } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { dashboardUi } from '@/components/layout/dashboard-ui'

type SubmissionType = 'TIME' | 'ATTENDANCE'
type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

type Employee = {
  id: string
  name: string | null
  email: string
  role: string
  isActive: boolean
}

type Submission = {
  id: string
  userId: string
  type: SubmissionType
  status: SubmissionStatus
  weekStart: string
  weekEnd: string
  rejectionReason: string | null
}

type WeeklyApprovalsPayload = {
  weekStart: string
  weekEnd: string
  employees: Employee[]
  submissions: Submission[]
}

function statusBadge(status: SubmissionStatus | 'NOT_SUBMITTED') {
  const cls =
    status === 'APPROVED'
      ? 'bg-emerald-100 text-emerald-900'
      : status === 'SUBMITTED'
        ? 'bg-amber-100 text-amber-950'
        : status === 'REJECTED'
          ? 'bg-rose-100 text-rose-900'
          : status === 'DRAFT'
            ? 'bg-slate-200 text-slate-900'
            : 'bg-gray-100 text-gray-700'
  const label = status === 'NOT_SUBMITTED' ? 'NOT SUBMITTED' : status
  return <Badge className={cn('font-medium', cls)}>{label}</Badge>
}

export function WeeklyApprovalsDashboard() {
  const { toast } = useToast()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<WeeklyApprovalsPayload | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ weekStart: weekStart.toISOString() })
      const res = await fetch(`/api/approvals/weekly?${qs}`)
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load approvals')
      }
      setPayload(json.data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load'
      toast({ title: 'Could not load approvals', description: msg, variant: 'destructive' })
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  const submissionIndex = useMemo(() => {
    const map = new Map<string, Submission>()
    for (const s of payload?.submissions || []) {
      map.set(`${s.userId}:${s.type}`, s)
    }
    return map
  }, [payload])

  const updateStatus = async (submissionId: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(submissionId)
    try {
      const res = await fetch(`/api/timesheet-submissions/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || 'Failed to update submission')
      await load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      toast({ title: 'Action failed', description: msg, variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  const renderCell = (employeeId: string, type: SubmissionType) => {
    const sub = submissionIndex.get(`${employeeId}:${type}`)
    const status: SubmissionStatus | 'NOT_SUBMITTED' = sub ? sub.status : 'NOT_SUBMITTED'
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {statusBadge(status)}
        {sub && sub.status === 'SUBMITTED' ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={processingId === sub.id}
              onClick={() => void updateStatus(sub.id, 'APPROVED')}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={processingId === sub.id}
              onClick={() => void updateStatus(sub.id, 'REJECTED')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  const weekEndLabel = endOfWeekFn(weekStart, { weekStartsOn: 0 })
  const title = `${format(weekStart, 'MMM d, yyyy')} – ${format(weekEndLabel, 'MMM d, yyyy')}`
  const sheetHref = (employeeId: string) =>
    `/dashboard/timekeeping/approvals/sheet?userId=${encodeURIComponent(employeeId)}&weekStart=${encodeURIComponent(weekStart.toISOString())}`

  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: weekEndLabel,
  })
  const today = new Date()

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white/90 py-4 sm:py-5">
          <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 shrink-0 rounded-lg bg-orange-100 p-2 text-orange-700">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">Weekly approvals</h2>
                <p className="text-sm text-slate-600">
                  Open an employee&apos;s weekly sheet to review punches and job time before approving.
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setWeekStart((d) => subWeeks(d, 1))} disabled={loading}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev week
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
                disabled={loading}
              >
                This week
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart((d) => addWeeks(d, 1))} disabled={loading}>
                Next week
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="w-full max-w-none p-0">
          <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white px-4 py-5 sm:px-6">
            <div className="mx-auto mb-4 max-w-4xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Week at a glance</p>
              <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{title}</p>
            </div>

            {/* Equal-width strip: flex + flex-1 avoids uneven grid gaps and empty space on wide layouts */}
            <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
              <div className="flex w-full">
                {weekDays.map((d, idx) => {
                  const weekend = d.getDay() === 0 || d.getDay() === 6
                  const isToday = isSameDay(d, today)
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        'flex min-w-0 flex-1 flex-col items-center justify-center border-slate-200/90 px-1 py-3 text-center sm:px-2 sm:py-4',
                        idx > 0 && 'border-l',
                        weekend ? 'bg-slate-50/90' : 'bg-white',
                        isToday && 'relative z-[1] bg-orange-50/95 shadow-[inset_0_0_0_2px_rgba(251,146,60,0.45)]'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-xs',
                          isToday ? 'text-orange-800' : weekend ? 'text-slate-500' : 'text-slate-600'
                        )}
                      >
                        {format(d, 'EEE')}
                      </span>
                      <span
                        className={cn(
                          'mt-1 text-sm font-semibold tabular-nums sm:text-base',
                          isToday ? 'text-orange-950' : 'text-slate-900'
                        )}
                      >
                        {format(d, 'M/d')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-md">
        <CardHeader className="border-b bg-slate-50/80 py-3 px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Employees</p>
          <p className="text-sm text-slate-600">
            {loading ? 'Loading…' : `${payload?.employees?.length || 0} employee${(payload?.employees?.length || 0) === 1 ? '' : 's'}`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 hover:bg-transparent bg-slate-50/50">
                  <TableHead className={cn(dashboardUi.tableHead, 'min-w-[200px]')}>Employee</TableHead>
                  <TableHead className={cn(dashboardUi.tableHead, 'whitespace-nowrap min-w-[140px]')}>Weekly sheet</TableHead>
                  <TableHead className={cn(dashboardUi.tableHead, 'whitespace-nowrap min-w-[160px]')}>Attendance</TableHead>
                  <TableHead className={cn(dashboardUi.tableHead, 'whitespace-nowrap min-w-[160px]')}>Job time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payload?.employees || []).map((e, idx) => (
                  <TableRow
                    key={e.id}
                    className={cn('text-sm border-slate-100', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}
                  >
                    <TableCell className="py-3 px-4 align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-900">{e.name || e.email}</span>
                        <span className="text-xs text-slate-500">{e.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 align-top">
                      <Button size="sm" className={cn(dashboardUi.primaryButton, 'gap-1.5')} asChild>
                        <Link href={sheetHref(e.id)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          View sheet
                        </Link>
                      </Button>
                    </TableCell>
                    <TableCell className="py-3 px-4 align-top">{renderCell(e.id, 'ATTENDANCE')}</TableCell>
                    <TableCell className="py-3 px-4 align-top">{renderCell(e.id, 'TIME')}</TableCell>
                  </TableRow>
                ))}
                {!loading && (payload?.employees || []).length === 0 ? (
                  <TableRow>
                    <TableCell className="py-12 text-center text-sm text-slate-500" colSpan={4}>
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
