'use client'

/**
 * Production Job Time UI — Timesheet + JobEntry pipeline (submit → TimeEntry → job costing).
 * Used on /dashboard/timekeeping/time (and optionally embedded in the Timesheets tabs).
 */

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  endOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Clock, FileText, Loader2, Plus, Send, Upload } from 'lucide-react'
import { convert12To24Hour, convert24To12Hour, formatTime12Hour, roundTimeString } from '@/lib/utils/time-rounding'
import { getWeekBoundariesUTC } from '@/lib/utils/date-utils'
import { normalizeProjectJobNumber } from '@/lib/utils/job-number'
import { billableHoursFromPunchRange, sanitizeBillableHours } from '@/lib/timekeeping/punch-hours'
import { jobEntryPunchIsOvertime } from '@/lib/timekeeping/job-entry-ot-flag'

const PROJECT_JOB_PREFIX = 'job:'
const PROJECT_QUOTE_PREFIX = 'quote:'

function jobOptionMatchingNumber(jobs: JobOption[], jobNumber: string): JobOption | undefined {
  const raw = jobNumber.trim()
  if (!raw) return undefined
  const norm = normalizeProjectJobNumber(raw)
  const candidates = new Set([raw, norm].filter(Boolean))
  return jobs.find((j) => candidates.has(j.jobNumber))
}

type QuoteOption = { id: string; quoteNumber: string; title: string }

function quoteMatchingNumber(quotes: QuoteOption[], jobNumber: string): QuoteOption | undefined {
  const raw = jobNumber.trim()
  if (!raw) return undefined
  const lower = raw.toLowerCase()
  return quotes.find((q) => q.quoteNumber === raw || q.quoteNumber.toLowerCase() === lower)
}

function jobNumberFromProjectKey(key: string, jobs: JobOption[], quotes: QuoteOption[]): string | null {
  if (!key) return null
  if (key.startsWith(PROJECT_JOB_PREFIX)) {
    const id = key.slice(PROJECT_JOB_PREFIX.length)
    return jobs.find((j) => j.id === id)?.jobNumber ?? null
  }
  if (key.startsWith(PROJECT_QUOTE_PREFIX)) {
    const id = key.slice(PROJECT_QUOTE_PREFIX.length)
    return quotes.find((q) => q.id === id)?.quoteNumber ?? null
  }
  return null
}

function projectKeyFromJobNumber(jobNumber: string, jobs: JobOption[], quotes: QuoteOption[]): string {
  const j = jobOptionMatchingNumber(jobs, jobNumber)
  if (j) return `${PROJECT_JOB_PREFIX}${j.id}`
  const q = quoteMatchingNumber(quotes, jobNumber)
  if (q) return `${PROJECT_QUOTE_PREFIX}${q.id}`
  return ''
}

type FlatJobRow = {
  id: string
  timesheetId: string
  userId: string
  date: string
  jobNumber: string
  laborCode: string
  punchInTime: string
  punchOutTime: string | null
  punchCountsAsOvertime: boolean
  manualOvertimeHours: number
  notes: string | null
  submissionStatus?: string | null
  isLocked?: boolean
}

type TimesheetApi = {
  id: string
  userId: string
  date: string
  clockInTime: string
  clockOutTime: string | null
  jobEntries: Array<{
    id: string
    jobNumber: string
    laborCode: string
    punchInTime: string
    punchOutTime: string | null
    notes: string | null
    punchCountsAsOvertime?: boolean
    manualOvertimeHours?: number
  }>
  submissionStatus?: string | null
  submissionId?: string | null
  isLocked?: boolean
}

type JobOption = { id: string; jobNumber: string; title: string }
type PhaseOption = { id: string; code: string; name: string }

function isoDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

function punchDurationHours(punchIn: string, punchOut: string | null): number {
  return billableHoursFromPunchRange(punchIn, punchOut)
}

function clampHours(value: string): string {
  const s = String(value || '').trim().toLowerCase()
  if (!s) return ''
  const minMatch = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/)
  if (minMatch) {
    const mins = Number(minMatch[1])
    if (!Number.isFinite(mins) || mins <= 0) return ''
    const hours = mins / 60
    return String(Math.round(hours * 4) / 4)
  }
  const hmMatch = s.match(/^(\d+)\s*:\s*(\d{1,2})$/)
  if (hmMatch) {
    const h = Number(hmMatch[1])
    const m = Number(hmMatch[2])
    if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
    if (h < 0 || m < 0 || m > 59) return ''
    const hours = h + m / 60
    if (hours <= 0) return ''
    return String(Math.round(hours * 4) / 4)
  }
  const cleaned = s.replace(/[^\d.]/g, '')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return ''
  if (n <= 0) return ''
  return String(Math.round(n * 4) / 4)
}

function parseExtraOtHours(raw: string): number {
  const s = String(raw ?? '').trim()
  if (!s) return 0
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

function rowLocked(e: FlatJobRow): boolean {
  return !!(e.isLocked || e.submissionStatus === 'SUBMITTED' || e.submissionStatus === 'APPROVED')
}

export type TimekeepingDevWorkspaceProps = {
  /** Omit dashboard shell (for use inside Timesheets tabs). */
  embedded?: boolean
  pageTitle?: string
  pageDescription?: string
  shellActions?: ReactNode
}

export function TimekeepingDevWorkspace({
  embedded = false,
  pageTitle = 'Timekeeping Dev',
  pageDescription =
    'Enter job time here, then use Submit for approval to record hours on jobs. Submit saves TimeEntry rows immediately; approval only affects workflow and editing locks.',
  shellActions,
}: TimekeepingDevWorkspaceProps = {}) {
  const { toast } = useToast()
  const { data: session, status: sessionStatus } = useSession()

  const currentUserId = session?.user?.id ?? ''
  const isAdmin = session?.user?.role === 'ADMIN'

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfDay(new Date()))
  const [timesheets, setTimesheets] = useState<TimesheetApi[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [usersOptions, setUsersOptions] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [quotes, setQuotes] = useState<QuoteOption[]>([])
  const [laborCodes, setLaborCodes] = useState<PhaseOption[]>([])
  const [weekSubmissionStatus, setWeekSubmissionStatus] = useState<string | null>(null)
  const [isSubmittingWeek, setIsSubmittingWeek] = useState(false)

  const [selectedProjectKey, setSelectedProjectKey] = useState('')
  const [draftStartTime, setDraftStartTime] = useState('')
  const [draftHours, setDraftHours] = useState('1')
  const [draftHasOt, setDraftHasOt] = useState(false)
  const [draftPhase, setDraftPhase] = useState('')
  const [draftDesc, setDraftDesc] = useState('')

  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const startTimeRef = useRef<HTMLInputElement | null>(null)
  const hoursRef = useRef<HTMLInputElement | null>(null)
  const notesRef = useRef<HTMLInputElement | null>(null)

  const projectOptionsForSelect = useMemo(() => {
    const quoteOpts = quotes.map((q) => ({
      value: `${PROJECT_QUOTE_PREFIX}${q.id}`,
      label: `Quote · ${q.quoteNumber} — ${q.title}`,
      searchText: `${q.quoteNumber} ${q.title}`,
    }))
    const jobOpts = jobs.map((j) => ({
      value: `${PROJECT_JOB_PREFIX}${j.id}`,
      label: `Job · ${j.jobNumber} — ${j.title}`,
      searchText: `${j.jobNumber} ${j.title}`,
    }))
    return [...quoteOpts, ...jobOpts]
  }, [jobs, quotes])

  const phaseOptionsForSelect = useMemo(
    () =>
      laborCodes
        .filter((c) => c && typeof c.code === 'string' && c.code.length > 0)
        .map((c) => ({
          value: c.code,
          label: `${c.code} — ${c.name ?? ''}`,
          searchText: `${c.code} ${c.name ?? ''}`,
        })),
    [laborCodes]
  )

  useEffect(() => {
    if (currentUserId && !selectedUserId) setSelectedUserId(currentUserId)
  }, [currentUserId, selectedUserId])

  useEffect(() => {
    if (!isAdmin || !session) return
    void (async () => {
      try {
        const res = await fetch('/api/users?activeOnly=true')
        const data = await jsonOrThrow<{ success?: boolean; data?: any[] }>(res)
        const arr = Array.isArray(data) ? data : data.data || []
        setUsersOptions(
          arr.map((u: any) => ({
            id: u.id,
            name: u.name || u.email || u.id,
            email: u.email || '',
          }))
        )
      } catch {
        // ignore
      }
    })()
  }, [isAdmin, session])

  useEffect(() => {
    void (async () => {
      try {
        const [jobsRes, quotesRes] = await Promise.all([
          fetch('/api/timekeeping-dev/jobs', { cache: 'no-store' }),
          fetch('/api/timekeeping-dev/quotes', { cache: 'no-store' }),
        ])
        const jobsJson = await jsonOrThrow<{ success: boolean; data: JobOption[] }>(jobsRes)
        const quotesJson = await jsonOrThrow<{ success: boolean; data: QuoteOption[] }>(quotesRes)
        setJobs(jobsJson.data || [])
        setQuotes(Array.isArray(quotesJson.data) ? quotesJson.data : [])
      } catch (e: any) {
        toast({ title: 'Failed to load jobs or quotes', description: e.message, variant: 'destructive' })
      }
    })()
    void (async () => {
      try {
        const res = await fetch('/api/timekeeping-dev/labor-codes', { cache: 'no-store' })
        const data = await jsonOrThrow<{ success: boolean; data?: PhaseOption[] }>(res)
        setLaborCodes(Array.isArray(data.data) ? data.data : [])
      } catch (e: any) {
        toast({ title: 'Failed to load phase codes', description: e.message, variant: 'destructive' })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setSelectedProjectKey((prev) => {
      if (prev) return prev
      if (jobs.length > 0) return `${PROJECT_JOB_PREFIX}${jobs[0].id}`
      if (quotes.length > 0) return `${PROJECT_QUOTE_PREFIX}${quotes[0].id}`
      return ''
    })
  }, [jobs, quotes])

  const currentDayKey = useMemo(() => isoDateOnly(currentDate), [currentDate])

  const range = useMemo(() => {
    if (viewMode === 'day') {
      const s = startOfDay(currentDate)
      const e = new Date(s)
      e.setHours(23, 59, 59, 999)
      return { start: s, end: e }
    }
    if (viewMode === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 })
      const e = endOfWeek(currentDate, { weekStartsOn: 0 })
      return { start: s, end: e }
    }
    const s = startOfMonth(currentDate)
    const e = endOfMonth(currentDate)
    return { start: s, end: e }
  }, [currentDate, viewMode])

  const flattenSheets = useCallback((list: TimesheetApi[]): FlatJobRow[] => {
    const rows: FlatJobRow[] = []
    for (const ts of list) {
      const jes = ts.jobEntries || []
      if (jes.length === 0) continue
      for (const je of jes) {
        rows.push({
          id: je.id,
          timesheetId: ts.id,
          userId: ts.userId,
          date: ts.date,
          jobNumber: je.jobNumber,
          laborCode: je.laborCode || '',
          punchInTime: je.punchInTime,
          punchOutTime: je.punchOutTime,
          punchCountsAsOvertime: jobEntryPunchIsOvertime(je.punchCountsAsOvertime),
          manualOvertimeHours: Number(je.manualOvertimeHours) || 0,
          notes: je.notes,
          submissionStatus: ts.submissionStatus,
          isLocked: ts.isLocked,
        })
      }
    }
    return rows
  }, [])

  const entriesByDay = useMemo(() => {
    const map = new Map<string, FlatJobRow[]>()
    for (const row of flattenSheets(timesheets)) {
      const k = isoDateOnly(new Date(row.punchInTime))
      const arr = map.get(k) || []
      arr.push(row)
      map.set(k, arr)
    }
    map.forEach((arr, k) => {
      arr.sort((a, b) => a.punchInTime.localeCompare(b.punchInTime))
      map.set(k, arr)
    })
    return map
  }, [timesheets, flattenSheets])

  const refreshWeekSubmission = useCallback(async () => {
    const uid = selectedUserId || currentUserId
    if (!uid) return
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    try {
      const res = await fetch(`/api/timesheet-submissions?userId=${encodeURIComponent(uid)}&weekStart=${encodeURIComponent(weekStart.toISOString())}`)
      if (!res.ok) {
        setWeekSubmissionStatus(null)
        return
      }
      const raw = await res.json()
      const list = raw.success && Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : []
      const jobOne = list.find(
        (sub: any) =>
          Array.isArray(sub.timeEntries) &&
          sub.timeEntries.some((te: any) => Boolean(te?.jobId))
      )
      setWeekSubmissionStatus(jobOne?.status ?? null)
    } catch {
      setWeekSubmissionStatus(null)
    }
  }, [selectedUserId, currentUserId, currentDate])

  const loadTimesheets = useCallback(async () => {
    const uid = selectedUserId || currentUserId
    if (!uid) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        userId: uid,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      })
      const res = await fetch(`/api/timesheets?${qs}`, { cache: 'no-store' })
      const payload = await jsonOrThrow<{ success: boolean; data: TimesheetApi[] }>(res)
      const list = payload.data || []
      const jobOnly = list.filter((ts) => ts.jobEntries && ts.jobEntries.length > 0)
      setTimesheets(jobOnly)
      await refreshWeekSubmission()
    } catch (e: any) {
      toast({ title: 'Failed to load time', description: e.message || 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [selectedUserId, currentUserId, range.start, range.end, toast, refreshWeekSubmission])

  useEffect(() => {
    void loadTimesheets()
  }, [loadTimesheets])

  const dailyTotal = useMemo(() => {
    return (entriesByDay.get(currentDayKey) || []).reduce((sum, e) => sum + punchDurationHours(e.punchInTime, e.punchOutTime), 0)
  }, [entriesByDay, currentDayKey])

  const weeklyTotal = useMemo(() => {
    if (viewMode === 'day') {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 })
      const e = endOfWeek(currentDate, { weekStartsOn: 0 })
      const sKey = isoDateOnly(s)
      const eKey = isoDateOnly(e)
      return flattenSheets(timesheets)
        .filter((x) => {
          const k = isoDateOnly(new Date(x.punchInTime))
          return k >= sKey && k <= eKey
        })
        .reduce((sum, x) => sum + punchDurationHours(x.punchInTime, x.punchOutTime), 0)
    }
    if (viewMode !== 'week') return 0
    return flattenSheets(timesheets).reduce((sum, x) => sum + punchDurationHours(x.punchInTime, x.punchOutTime), 0)
  }, [currentDate, timesheets, viewMode, flattenSheets])

  const weekLocked = weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED'

  async function getOrCreateJobTimesheet(day: Date): Promise<string> {
    const uid = selectedUserId || currentUserId
    const y = day.getFullYear()
    const m = day.getMonth()
    const d = day.getDate()
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const start = new Date(y, m, d, 0, 0, 0, 0)
    const end = new Date(y, m, d, 23, 59, 59, 999)
    const res = await fetch(
      `/api/timesheets?userId=${encodeURIComponent(uid)}&startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`,
      { cache: 'no-store' }
    )
    const payload = await jsonOrThrow<{ success: boolean; data: TimesheetApi[] }>(res)
    const list = payload.data || []

    const midnightNoOut = (ts: TimesheetApi) => {
      const ci = new Date(ts.clockInTime)
      return ci.getHours() === 0 && ci.getMinutes() === 0 && !ts.clockOutTime
    }
    const existing = list.find((ts) => (ts.jobEntries && ts.jobEntries.length > 0) || midnightNoOut(ts))
    if (existing) return existing.id

    const body: Record<string, string> = {
      clockInTime: new Date(y, m, d, 0, 0, 0, 0).toISOString(),
      date: dateStr,
    }
    if (isAdmin && uid !== currentUserId) body.userId = uid

    const post = await fetch('/api/timesheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const created = await jsonOrThrow<{ id?: string; data?: { id: string } }>(post)
    const id = created.id || created.data?.id
    if (!id) throw new Error('Could not create timesheet')
    return id
  }

  const normalizeTimeInput = (raw: string): string => {
    const s = raw.trim()
    if (!s) return ''
    const digitsOnly = s.match(/^(\d{3,4})$/)
    if (digitsOnly) {
      const dig = digitsOnly[1]
      const hoursPart = dig.slice(0, dig.length - 2)
      const minutesPart = dig.slice(-2)
      const h = Number(hoursPart)
      const min = Number(minutesPart)
      if (!Number.isFinite(h) || !Number.isFinite(min)) return s
      if (h < 1 || h > 12 || min < 0 || min > 59) return s
      const t24 = convert12To24Hour(`${h}:${String(min).padStart(2, '0')}`)
      const rounded24 = roundTimeString(t24)
      return convert24To12Hour(rounded24)
    }
    const m1 = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([aApP][mM])?$/)
    if (m1) {
      const h = Number(m1[1])
      const minRaw = m1[2]
      const min = minRaw === undefined ? 0 : Number(minRaw)
      const period = m1[3] ? m1[3].toUpperCase() : ''
      if (!Number.isFinite(h) || !Number.isFinite(min)) return s
      if (h < 1 || h > 12 || min < 0 || min > 59) return s
      const t12 = `${h}:${String(min).padStart(2, '0')}${period ? ` ${period}` : ''}`
      const t24 = convert12To24Hour(t12)
      const rounded24 = roundTimeString(t24)
      return convert24To12Hour(rounded24)
    }
    return s
  }

  const parseUserTimeTo24 = (raw: string): string => {
    const normalized12 = normalizeTimeInput(raw)
    if (!normalized12) return ''
    const t24 = convert12To24Hour(normalized12)
    return roundTimeString(t24)
  }

  async function createEntry() {
    if (!currentUserId || sessionStatus === 'loading') return
    if (weekLocked && weekSubmissionStatus !== 'REJECTED') {
      toast({
        title: 'Week locked',
        description: 'This week is submitted or approved. Wait for approval or rejection.',
        variant: 'default',
      })
      return
    }

    const rounded24 = parseUserTimeTo24(draftStartTime)
    if (!rounded24) {
      toast({ title: 'Invalid start time', description: 'Examples: 1200, 9:30, 1:15pm', variant: 'destructive' })
      return
    }
    const normalized12 = convert24To12Hour(rounded24)
    if (normalized12 !== draftStartTime) setDraftStartTime(normalized12)

    const [hh, mm] = rounded24.split(':').map((x) => Number(x))
    const startIso = new Date(currentDate)
    startIso.setHours(hh, mm, 0, 0)

    const normalizedHours = clampHours(draftHours)
    if (!normalizedHours) {
      toast({ title: 'Invalid hours', description: 'Examples: 0.25, 1.5, 15m', variant: 'destructive' })
      return
    }
    if (normalizedHours !== draftHours) setDraftHours(normalizedHours)
    const hours = Number(normalizedHours)
    const jobNumber = jobNumberFromProjectKey(selectedProjectKey, jobs, quotes)
    if (!jobNumber) {
      toast({ title: 'Pick a job or quote', variant: 'destructive' })
      return
    }

    const punchOut = new Date(startIso.getTime() + hours * 3_600_000)

    try {
      const timesheetId = await getOrCreateJobTimesheet(currentDate)
      const res = await fetch(`/api/timesheets/${timesheetId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobNumber,
          laborCode: draftPhase || '',
          punchInTime: startIso.toISOString(),
          punchOutTime: punchOut.toISOString(),
          notes: draftDesc || null,
          punchCountsAsOvertime: draftHasOt,
          manualOvertimeHours: 0,
        }),
      })
      await jsonOrThrow(res)
      setDraftDesc('')
      setDraftHasOt(false)
      await loadTimesheets()
      try {
        const rounded = new Date(startIso)
        rounded.setMinutes(rounded.getMinutes() + 15, 0, 0)
        setDraftStartTime(formatTime12Hour(rounded))
      } catch {
        /* ignore */
      }
      requestAnimationFrame(() => startTimeRef.current?.focus())
    } catch (e: any) {
      toast({ title: 'Failed to add entry', description: e.message, variant: 'destructive' })
    }
  }

  async function patchJobEntry(jobEntryId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/jobs/${jobEntryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await jsonOrThrow(res)
    await loadTimesheets()
  }

  async function deleteRow(jobEntryId: string) {
    const res = await fetch(`/api/jobs/${jobEntryId}`, { method: 'DELETE' })
    await jsonOrThrow(res)
    await loadTimesheets()
  }

  const handleSubmitWeekForApproval = async () => {
    const userIdToSubmit = selectedUserId || currentUserId
    if (!userIdToSubmit) {
      toast({ title: 'Sign in required', variant: 'destructive' })
      return
    }
    if (weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED') {
      toast({ title: 'Already submitted', variant: 'default' })
      return
    }
    const confirmationMessage =
      weekSubmissionStatus === 'REJECTED'
        ? 'Resubmit this week for approval? Edits will lock again until processed.'
        : 'Submit this week for approval? You will not be able to edit job time until approved or rejected.'
    if (!window.confirm(confirmationMessage)) return

    setIsSubmittingWeek(true)
    try {
      const flat = flattenSheets(timesheets).filter((r) => r.userId === userIdToSubmit)
      if (flat.length === 0) {
        toast({ title: 'Nothing to submit', description: 'Add job time rows first.', variant: 'destructive' })
        return
      }
      const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const currentWeekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
      const weekStartNormalized = startOfDay(currentWeekStart)
      const weekEndNormalized = endOfDay(currentWeekEnd)
      const weekRows = flat.filter((r) => {
        const tsDate = startOfDay(new Date(r.date))
        return tsDate >= weekStartNormalized && tsDate <= weekEndNormalized
      })
      if (weekRows.length === 0) {
        toast({ title: 'Nothing to submit', description: 'No entries in this calendar week.', variant: 'destructive' })
        return
      }

      const timeEntries: any[] = []
      for (const r of weekRows) {
        const job = jobOptionMatchingNumber(jobs, r.jobNumber)
        const laborCode = laborCodes.find((lc) => lc.code === (r.laborCode || '').trim())
        const punchHours = punchDurationHours(r.punchInTime, r.punchOutTime)
        const isOt = jobEntryPunchIsOvertime(r.punchCountsAsOvertime)
        const regularHours = isOt ? 0 : sanitizeBillableHours(punchHours)
        const overtimeHours = isOt ? sanitizeBillableHours(punchHours) : 0
        const phaseKey = (r.laborCode || '').trim()
        timeEntries.push({
          date: new Date(r.date).toISOString(),
          regularHours,
          overtimeHours,
          notes: r.notes || null,
          billable: true,
          jobId: job?.id,
          jobNumber: r.jobNumber,
          laborCodeId: laborCode?.id ?? null,
          laborCode: phaseKey || null,
          jobEntryId: r.id,
        })
      }

      const { weekStart, weekEnd } = getWeekBoundariesUTC(currentDate)
      const response = await fetch('/api/timesheet-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdToSubmit,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          timeEntries,
        }),
      })
      const responseData = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Submit failed (${response.status})`)
      }
      toast({
        title: 'Submitted',
        description: `Week of ${format(currentWeekStart, 'MMM d')} – ${format(currentWeekEnd, 'MMM d, yyyy')} sent for approval.`,
      })
      setWeekSubmissionStatus('SUBMITTED')
      await loadTimesheets()
    } catch (e: any) {
      toast({ title: 'Submit failed', description: e.message, variant: 'destructive' })
    } finally {
      setIsSubmittingWeek(false)
    }
  }

  async function runImport(file: File) {
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // Preserve local wall-clock times from Excel.
      fd.append('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone || '')
      fd.append('timezoneOffsetMinutes', String(new Date().getTimezoneOffset()))
      // Use the original (known-working) production importer.
      const res = await fetch('/api/timesheets/import', { method: 'POST', body: fd })
      const payload = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(payload?.error || payload?.message || `Import failed (${res.status})`)
      toast({
        title: 'Import complete',
        description: `Inserted ${payload?.data?.inserted ?? 0}, rejected ${payload?.data?.rejected ?? 0}`,
        variant: payload?.data?.rejected > 0 ? 'destructive' : undefined,
      })
      await loadTimesheets()
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  const weekDays = useMemo(() => {
    const s = startOfWeek(currentDate, { weekStartsOn: 0 })
    const e = endOfWeek(currentDate, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: s, end: e })
  }, [currentDate])

  const calendarDays = useMemo(() => {
    const ms = startOfMonth(currentDate)
    const me = endOfMonth(currentDate)
    const s = startOfWeek(ms, { weekStartsOn: 0 })
    const e = endOfWeek(me, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: s, end: e })
  }, [currentDate])

  const navigate = (dir: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      if (viewMode === 'day') return startOfDay(dir === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
      if (viewMode === 'week') return dir === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
      return dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    })
  }

  const goToToday = () => setCurrentDate(startOfDay(new Date()))

  if (sessionStatus === 'loading' || !session) {
    const spinner = (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
    if (embedded) return spinner
    return (
      <DashboardPageShell title={pageTitle} description="">
        {spinner}
      </DashboardPageShell>
    )
  }

  const userSelectOptions = usersOptions.map((u) => ({
    value: u.id,
    label: u.name || u.email,
    searchText: `${u.name} ${u.email}`,
  }))

  const cardClass = embedded
    ? 'flex flex-col min-h-[360px]'
    : 'flex flex-col min-h-[calc(100vh-220px)]'

  const body = (
      <Card className={cardClass}>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job & quote time
              </CardTitle>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.xlsm,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void runImport(f)
                    if (e.target) e.target.value = ''
                  }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 sm:mr-2" />}
                  <span className="hidden sm:inline">Import .xlsx</span>
                </Button>
                <Button
                  onClick={() => requestAnimationFrame(() => startTimeRef.current?.focus())}
                  className="h-9 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                  disabled={weekLocked && weekSubmissionStatus !== 'REJECTED'}
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  Add Time
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed rounded-md border bg-muted/35 px-3 py-2">
              Add rows, then submit the week.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
              {isAdmin ? (
                <div className="w-full sm:w-[260px]">
                  <div className="text-[11px] font-medium text-muted-foreground mb-1">User</div>
                  <SearchableSelect
                    options={userSelectOptions}
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    placeholder="Select user…"
                    emptyMessage="No users"
                    className="w-full space-y-1"
                    dense
                  />
                </div>
              ) : null}

              <div
                role="tablist"
                aria-label="Calendar view"
                className="grid w-full grid-cols-3 gap-1 rounded-lg border bg-gray-100 p-1 sm:inline-flex sm:w-auto"
              >
                {(['day', 'week', 'month'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={viewMode === mode}
                    className={cn(
                      'rounded-md px-3 text-xs font-semibold transition-colors sm:min-h-[36px] sm:text-sm min-h-[44px]',
                      viewMode === mode
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-background/80'
                    )}
                    onClick={() => setViewMode(mode)}
                  >
                    {mode === 'day' ? 'Day' : mode === 'week' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="h-9" onClick={() => navigate('prev')}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => navigate('next')}>
                  Next
                </Button>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <div className="text-sm font-semibold px-3 py-2 bg-gray-50 rounded-md border w-full text-center sm:w-auto sm:text-left">
                  {viewMode === 'day'
                    ? format(currentDate, 'EEE, MMM d, yyyy')
                    : viewMode === 'week'
                      ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'M/d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'M/d')}`
                      : format(currentDate, 'MMMM yyyy')}
                </div>
                <Button
                  type="button"
                  onClick={() => void handleSubmitWeekForApproval()}
                  disabled={
                    isSubmittingWeek ||
                    !(selectedUserId || currentUserId) ||
                    weekSubmissionStatus === 'SUBMITTED' ||
                    weekSubmissionStatus === 'APPROVED'
                  }
                  title={
                    weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED'
                      ? 'This calendar week is already submitted or approved.'
                      : undefined
                  }
                  className="h-10 sm:h-9 w-full sm:w-auto shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                  size="sm"
                >
                  {isSubmittingWeek ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {weekSubmissionStatus === 'REJECTED'
                    ? 'Resubmit'
                    : weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED'
                      ? 'Submitted'
                      : 'Submit for approval'}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col">
          {loading ? (
            <div className="mt-2 flex flex-1 flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="mb-2 h-8 w-8 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              {viewMode === 'day' && (
              <div className="mt-2 flex min-h-0 flex-1 flex-col space-y-2">
                <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    Day: <span className="font-mono text-foreground">{dailyTotal.toFixed(2)}</span>h
                  </span>
                  <span className="text-muted-foreground">
                    Week: <span className="font-mono text-foreground">{weeklyTotal.toFixed(2)}</span>h
                  </span>
                  <span className="text-muted-foreground">
                    Rows: <span className="font-mono">{(entriesByDay.get(currentDayKey) || []).length}</span>
                  </span>
                  {weekSubmissionStatus ? (
                    <span className="text-xs font-medium text-amber-800">Week status: {weekSubmissionStatus}</span>
                  ) : null}
                </div>

                <div className="rounded-lg border border-green-200/70 bg-green-50/35 px-3 py-2 shadow-sm space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-green-900">
                      Add time entry
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-green-100/80 bg-background/90 px-2 py-1">
                      <label className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground whitespace-nowrap leading-none">
                        <Checkbox
                          checked={draftHasOt}
                          onCheckedChange={(v) => setDraftHasOt(v === true)}
                        />
                        OT
                      </label>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        (treats these hours as OT using the multiplier)
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto overflow-y-visible -mx-0.5 px-0.5 pt-1 border-t border-green-200/45">
                    {/* Table layout: guarantees Job + Start + Hours stay on one physical row (no flex/grid quirks). */}
                    <table
                      role="presentation"
                      className="w-max max-w-none pb-0.5"
                      style={{ borderCollapse: 'separate', borderSpacing: '12px 4px' }}
                    >
                      <tbody>
                        <tr className="align-bottom">
                          <td className="p-0 align-bottom whitespace-nowrap">
                            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
                              Job / quote
                            </Label>
                          </td>
                          <td className="p-0 align-bottom whitespace-nowrap">
                            <Label
                              htmlFor="draft-start"
                              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none"
                            >
                              Start
                            </Label>
                          </td>
                          <td className="p-0 align-bottom whitespace-nowrap">
                            <Label
                              htmlFor="draft-hours"
                              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none"
                            >
                              Hours
                            </Label>
                          </td>
                          <td className="p-0 align-bottom whitespace-nowrap">
                            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
                              Phase
                            </Label>
                          </td>
                          <td className="p-0 align-bottom whitespace-nowrap">
                            <Label
                              htmlFor="draft-notes"
                              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none"
                            >
                              Notes
                            </Label>
                          </td>
                          <td className="p-0 align-bottom w-px" aria-hidden />
                        </tr>
                        <tr className="align-top">
                          <td className="p-0 align-top w-[260px] max-w-[260px] min-w-[200px]">
                            <SearchableSelect
                              options={projectOptionsForSelect}
                              value={selectedProjectKey}
                              onValueChange={setSelectedProjectKey}
                              placeholder="Select job or quote…"
                              emptyMessage="No jobs or quotes"
                              className="w-full min-w-0 !space-y-0"
                              dense
                              triggerClassName="h-9 text-xs"
                            />
                          </td>
                          <td className="p-0 align-top w-[5.25rem]">
                            <Input
                              id="draft-start"
                              ref={startTimeRef}
                              value={draftStartTime}
                              onChange={(e) => setDraftStartTime(e.target.value)}
                              placeholder="1200"
                              className="h-9 w-full font-mono text-xs tabular-nums px-2"
                              disabled={weekLocked && weekSubmissionStatus !== 'REJECTED'}
                              onBlur={() => {
                                const n = normalizeTimeInput(draftStartTime)
                                if (n) setDraftStartTime(n)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const n = normalizeTimeInput(draftStartTime)
                                  if (n) setDraftStartTime(n)
                                  requestAnimationFrame(() => hoursRef.current?.focus())
                                }
                              }}
                            />
                          </td>
                          <td className="p-0 align-top w-[5.25rem]">
                            <Input
                              id="draft-hours"
                              ref={hoursRef}
                              value={draftHours}
                              onChange={(e) => setDraftHours(e.target.value)}
                              className="h-9 w-full text-xs tabular-nums px-2"
                              disabled={weekLocked && weekSubmissionStatus !== 'REJECTED'}
                              onBlur={() => {
                                const v = clampHours(draftHours)
                                if (v) setDraftHours(v)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void createEntry()
                              }}
                            />
                          </td>
                          <td className="p-0 align-top w-[11rem] min-w-[10rem]">
                            <SearchableSelect
                              options={phaseOptionsForSelect}
                              value={draftPhase}
                              onValueChange={setDraftPhase}
                              getTriggerLabel={(o) => o.value}
                              placeholder="—"
                              emptyMessage="None"
                              className="w-full min-w-0 !space-y-0"
                              dense
                              triggerClassName="h-9 text-xs px-2 w-full"
                            />
                          </td>
                          <td className="p-0 align-top min-w-[160px] w-[220px] max-w-[280px]">
                            <Input
                              id="draft-notes"
                              ref={notesRef}
                              value={draftDesc}
                              onChange={(e) => setDraftDesc(e.target.value)}
                              placeholder="Optional"
                              className="h-9 w-full min-w-0 text-xs px-2"
                              disabled={weekLocked && weekSubmissionStatus !== 'REJECTED'}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void createEntry()
                              }}
                            />
                          </td>
                          <td className="p-0 align-top whitespace-nowrap">
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 px-4 text-xs font-semibold"
                              disabled={weekLocked && weekSubmissionStatus !== 'REJECTED'}
                              onClick={() => void createEntry()}
                            >
                              Add
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-md border flex-1 min-h-0 flex flex-col overflow-hidden overflow-x-auto">
                  <Table className="table-fixed min-w-[1000px] w-full border-collapse">
                    <colgroup>
                      <col style={{ width: '280px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '88px' }} />
                      <col style={{ width: '58px' }} />
                      <col style={{ width: '64px' }} />
                      <col style={{ width: '132px' }} />
                      <col />
                      <col style={{ width: '76px' }} />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-20 bg-background">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-10 px-2 py-2 text-xs font-semibold">Job / quote</TableHead>
                        <TableHead className="h-10 px-2 py-2 text-xs font-semibold">Start</TableHead>
                        <TableHead className="h-10 px-2 py-2 text-xs font-semibold">Hours</TableHead>
                        <TableHead className="h-10 px-2 py-2 text-xs font-semibold text-center">OT</TableHead>
                        <TableHead className="h-10 px-2 py-2 text-xs font-semibold">Phase</TableHead>
                        <TableHead className="h-10 px-2 py-2 text-xs font-semibold">Notes</TableHead>
                        <TableHead className="h-10 px-2 py-2 text-xs font-semibold text-right w-[76px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(entriesByDay.get(currentDayKey) || []).map((e) => {
                        const locked = rowLocked(e)
                        const start = new Date(e.punchInTime)
                        const startLabel = Number.isNaN(start.getTime()) ? '' : formatTime12Hour(start)
                        const hrs = punchDurationHours(e.punchInTime, e.punchOutTime).toFixed(2)
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="p-2 align-middle min-w-0">
                              <SearchableSelect
                                options={projectOptionsForSelect}
                                value={projectKeyFromJobNumber(e.jobNumber, jobs, quotes)}
                                onValueChange={(key) => {
                                  const nextNum = jobNumberFromProjectKey(key, jobs, quotes)
                                  if (!nextNum || locked) return
                                  void patchJobEntry(e.id, { jobNumber: nextNum })
                                }}
                                placeholder="—"
                                emptyMessage="No jobs or quotes"
                                className="w-full min-w-0 space-y-1"
                                dense
                                disabled={locked}
                              />
                            </TableCell>
                            <TableCell className="p-2 align-middle font-mono min-w-0">
                              <Input
                                defaultValue={startLabel}
                                className="h-9 w-full font-mono"
                                disabled={locked}
                                onBlur={(ev) => {
                                  const rounded24 = parseUserTimeTo24(ev.target.value)
                                  if (!rounded24 || locked) return
                                  ev.target.value = convert24To12Hour(rounded24)
                                  const dt = new Date(e.punchInTime)
                                  const [hhi, mmi] = rounded24.split(':').map(Number)
                                  dt.setHours(hhi, mmi, 0, 0)
                                  const dur = punchDurationHours(e.punchInTime, e.punchOutTime)
                                  const pout = new Date(dt.getTime() + dur * 3_600_000)
                                  void patchJobEntry(e.id, { punchInTime: dt.toISOString(), punchOutTime: pout.toISOString() })
                                }}
                                onKeyDown={(ev) => {
                                  if (ev.key === 'Enter') ev.currentTarget.blur()
                                }}
                              />
                            </TableCell>
                            <TableCell className="p-2 align-middle">
                              <Input
                                defaultValue={hrs}
                                className="h-9 w-full"
                                disabled={locked}
                                onBlur={(ev) => {
                                  const v = clampHours(ev.target.value)
                                  if (!v || locked) return
                                  ev.target.value = v
                                  const pin = new Date(e.punchInTime)
                                  const h = Number(v)
                                  const pout = new Date(pin.getTime() + h * 3_600_000)
                                  void patchJobEntry(e.id, { punchInTime: pin.toISOString(), punchOutTime: pout.toISOString() })
                                }}
                                onKeyDown={(ev) => {
                                  if (ev.key === 'Enter') ev.currentTarget.blur()
                                }}
                              />
                            </TableCell>
                            <TableCell className="p-2 align-middle">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={jobEntryPunchIsOvertime(e.punchCountsAsOvertime)}
                                  disabled={locked}
                                  onCheckedChange={(v) => {
                                    if (locked) return
                                    void patchJobEntry(e.id, { punchCountsAsOvertime: v === true, manualOvertimeHours: 0 })
                                  }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="p-2 align-middle min-w-[10rem]">
                              <SearchableSelect
                                options={phaseOptionsForSelect}
                                value={e.laborCode || ''}
                                onValueChange={(code) => {
                                  if (locked) return
                                  void patchJobEntry(e.id, { laborCode: code || '' })
                                }}
                                getTriggerLabel={(o) => o.value}
                                placeholder="—"
                                emptyMessage="None"
                                className="w-full min-w-0 space-y-1"
                                dense
                                disabled={locked}
                                triggerClassName="h-9 text-xs w-full"
                              />
                            </TableCell>
                            <TableCell className="p-2 align-middle min-w-0">
                              <Input
                                defaultValue={e.notes || ''}
                                className="h-9 w-full"
                                disabled={locked}
                                onBlur={(ev) => {
                                  if (locked) return
                                  void patchJobEntry(e.id, { notes: ev.target.value })
                                }}
                              />
                            </TableCell>
                            <TableCell className="p-2 align-middle text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-9"
                                disabled={locked}
                                onClick={() => void deleteRow(e.id)}
                              >
                                Del
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {(entriesByDay.get(currentDayKey) || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-6 text-center text-xs text-muted-foreground">
                            No entries for this day yet.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
              )}

              {viewMode === 'week' && (
              <div className="mt-2 flex min-h-0 flex-1 flex-col space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                  {weekDays.map((d) => (
                    <div key={d.toISOString()} className="hidden sm:block text-center font-semibold text-gray-700 py-2 border-b">
                      {format(d, 'EEE')}
                      <div className="text-sm font-normal text-gray-500">{format(d, 'MMM d')}</div>
                    </div>
                  ))}
                  {weekDays.map((day) => {
                    const k = isoDateOnly(day)
                    const dayEntries = entriesByDay.get(k) || []
                    const total = dayEntries.reduce((sum, row) => sum + punchDurationHours(row.punchInTime, row.punchOutTime), 0)
                    const isToday = isSameDay(day, new Date())
                    return (
                      <div
                        key={k}
                        className={`min-h-[200px] border-2 rounded-lg p-2 cursor-pointer ${isToday ? 'border-green-400 bg-green-50/30' : 'border-gray-200 bg-white hover:border-green-300'}`}
                        onClick={() => {
                          setCurrentDate(startOfDay(day))
                          setViewMode('day')
                          requestAnimationFrame(() => startTimeRef.current?.focus())
                        }}
                      >
                        <div className="text-xs font-medium text-gray-600 mb-2">{format(day, 'd')}</div>
                        {dayEntries.length === 0 ? (
                          <div className="text-xs text-gray-400 italic text-center py-2">No entries</div>
                        ) : (
                          <div className="space-y-1">
                            {dayEntries.slice(0, 6).map((row) => (
                              <div key={row.id} className="text-xs p-1.5 border rounded bg-green-100 border-green-200">
                                <div className="font-medium text-green-800">
                                  {format(new Date(row.punchInTime), 'h:mm a')} • {punchDurationHours(row.punchInTime, row.punchOutTime).toFixed(2)}h • {row.jobNumber}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {total > 0 ? (
                          <div className="mt-2 pt-2 border-t text-xs font-bold text-green-700 text-center">{total.toFixed(2)}h</div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
              )}

              {viewMode === 'month' && (
              <div className="mt-2 flex min-h-0 flex-1 flex-col space-y-4">
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                    <div key={label} className="text-center font-semibold text-gray-700 py-2 text-xs border-b">
                      {label}
                    </div>
                  ))}
                  {calendarDays.map((day) => {
                    const k = isoDateOnly(day)
                    const dayEntries = entriesByDay.get(k) || []
                    const total = dayEntries.reduce((sum, row) => sum + punchDurationHours(row.punchInTime, row.punchOutTime), 0)
                    const today = isSameDay(day, new Date())
                    const currentMonth = isSameMonth(day, currentDate)
                    return (
                      <div
                        key={k}
                        onClick={() => {
                          setCurrentDate(startOfDay(day))
                          setViewMode('day')
                        }}
                        className={`min-h-[70px] sm:min-h-[90px] p-2 border rounded-lg cursor-pointer ${today ? 'border-green-300 bg-green-50/50' : 'border-gray-200'} ${!currentMonth ? 'opacity-40' : ''}`}
                      >
                        <div className={`text-xs font-medium mb-1 ${today ? 'text-green-600 font-bold' : 'text-gray-700'}`}>{format(day, 'd')}</div>
                        {total > 0 ? (
                          <div className="text-[10px] font-bold text-green-700 text-center">{total.toFixed(1)}h</div>
                        ) : (
                          <div className="text-[10px] text-gray-400 text-center">{dayEntries.length ? `${dayEntries.length} rows` : ''}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
  )

  if (embedded) return body

  return (
    <DashboardPageShell title={pageTitle} description={pageDescription} actions={shellActions}>
      {body}
    </DashboardPageShell>
  )
}
