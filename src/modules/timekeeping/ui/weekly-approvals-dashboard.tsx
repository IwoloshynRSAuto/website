'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
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
    } catch (e: any) {
      toast({ title: 'Could not load approvals', description: e?.message, variant: 'destructive' })
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
        body: JSON.stringify(status === 'APPROVED' ? { status } : { status }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to update submission')
      await load()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e?.message, variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  const renderCell = (employeeId: string, type: SubmissionType) => {
    const sub = submissionIndex.get(`${employeeId}:${type}`)
    const status: SubmissionStatus | 'NOT_SUBMITTED' = sub ? sub.status : 'NOT_SUBMITTED'
    return (
      <div className="flex items-center justify-between gap-2">
        {statusBadge(status)}
        {sub && sub.status === 'SUBMITTED' ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={processingId === sub.id}
              onClick={() => void updateStatus(sub.id, 'APPROVED')}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
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

  const title = `${format(weekStart, 'MMM d, yyyy')} – ${format(addWeeks(weekStart, 1), 'MMM d, yyyy')}`
  const sheetHref = (employeeId: string) =>
    `/dashboard/timekeeping/approvals/sheet?userId=${encodeURIComponent(employeeId)}&weekStart=${encodeURIComponent(weekStart.toISOString())}`

  return (
    <div className="space-y-4">
      <div className={cn(dashboardUi.toolbarRow)}>
        <div className="min-w-0 flex-1 sm:flex-none" />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setWeekStart((d) => subWeeks(d, 1))} disabled={loading}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          <Badge variant="secondary" className="px-3 py-1.5">
            {title}
          </Badge>
          <Button variant="outline" onClick={() => setWeekStart((d) => addWeeks(d, 1))} disabled={loading}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-md">
        <CardHeader className="border-b py-3 px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Week overview</p>
          <p className="text-sm text-slate-600">
            {loading ? 'Loading…' : `${payload?.employees?.length || 0} employee${(payload?.employees?.length || 0) === 1 ? '' : 's'}`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(dashboardUi.tableHead)}>Employee</TableHead>
                  <TableHead className={cn(dashboardUi.tableHead, 'whitespace-nowrap')}>Attendance</TableHead>
                  <TableHead className={cn(dashboardUi.tableHead, 'whitespace-nowrap')}>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payload?.employees || []).map((e) => (
                  <TableRow key={e.id} className="text-sm">
                    <TableCell className="py-2 px-3">
                      <div className="flex flex-col">
                        <Link
                          href={sheetHref(e.id)}
                          className="font-medium text-slate-900 hover:underline underline-offset-2 w-fit"
                        >
                          {e.name || e.email}
                        </Link>
                        <span className="text-xs text-slate-500">{e.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">{renderCell(e.id, 'ATTENDANCE')}</TableCell>
                    <TableCell className="py-2 px-3">{renderCell(e.id, 'TIME')}</TableCell>
                  </TableRow>
                ))}
                {!loading && (payload?.employees || []).length === 0 ? (
                  <TableRow>
                    <TableCell className="py-10 text-center text-sm text-slate-500" colSpan={3}>
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
