'use client'

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
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, Loader2, Plus, Upload } from 'lucide-react'
import { convert12To24Hour, convert24To12Hour, formatTime12Hour, roundTimeString } from '@/lib/utils/time-rounding'

type DevEntry = {
  id: string
  userId: string
  jobId?: string | null
  job?: { id: string; jobNumber: string; title: string }
  date: string
  startTime: string
  endTime: string | null
  hoursWorked: string
  phaseCode: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

type JobOption = { value: string; label: string; searchText?: string }
type PhaseOption = { value: string; label: string; searchText?: string }

function isoDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

function clampHours(value: string): string {
  const s = String(value || '').trim().toLowerCase()
  if (!s) return ''

  // Minutes shorthand: "15m", "90min"
  const minMatch = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/)
  if (minMatch) {
    const mins = Number(minMatch[1])
    if (!Number.isFinite(mins) || mins <= 0) return ''
    const hours = mins / 60
    return String(Math.round(hours * 4) / 4) // nearest 0.25
  }

  // H:MM shorthand: "1:15" -> 1.25
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

  // Plain numeric hours: "0.25", "1.5"
  const cleaned = s.replace(/[^\d.]/g, '')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return ''
  if (n <= 0) return ''
  return String(Math.round(n * 4) / 4) // nearest 0.25
}

function addHoursString(base: string, add: number): string {
  const n = Number(base || 0)
  const next = (Number.isFinite(n) ? n : 0) + add
  return String(Math.round(next * 100) / 100)
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

export default function TimekeepingDevPage() {
  const { toast } = useToast()

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfDay(new Date()))
  const [entries, setEntries] = useState<DevEntry[]>([])
  const [loading, setLoading] = useState(false)

  const [jobOptions, setJobOptions] = useState<JobOption[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [phaseOptions, setPhaseOptions] = useState<PhaseOption[]>([])

  // "Add time" flow: don't prefill with "now"; start empty and then
  // auto-advance based on the last created entry.
  const [draftStartTime, setDraftStartTime] = useState('')
  const [draftHours, setDraftHours] = useState('1')
  const [draftPhase, setDraftPhase] = useState('')
  const [draftDesc, setDraftDesc] = useState('')

  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const startTimeRef = useRef<HTMLInputElement | null>(null)
  const hoursRef = useRef<HTMLInputElement | null>(null)
  const notesRef = useRef<HTMLInputElement | null>(null)

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

  const dailyTotal = useMemo(() => {
    return entries
      .filter((e) => isoDateOnly(new Date(e.startTime)) === currentDayKey)
      .reduce((sum, e) => sum + (Number(e.hoursWorked) || 0), 0)
  }, [entries, currentDayKey])

  const weeklyTotal = useMemo(() => {
    if (viewMode === 'day') {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 })
      const e = endOfWeek(currentDate, { weekStartsOn: 0 })
      const sKey = isoDateOnly(s)
      const eKey = isoDateOnly(e)
      return entries
        .filter((x) => {
          const k = isoDateOnly(new Date(x.startTime))
          return k >= sKey && k <= eKey
        })
        .reduce((sum, x) => sum + (Number(x.hoursWorked) || 0), 0)
    }
    if (viewMode !== 'week') return 0
    return entries.reduce((sum, x) => sum + (Number(x.hoursWorked) || 0), 0)
  }, [currentDate, entries, viewMode])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/timekeeping-dev/entries?startDate=${encodeURIComponent(range.start.toISOString())}&endDate=${encodeURIComponent(
          range.end.toISOString()
        )}`,
        { cache: 'no-store' }
      )
      const data = await jsonOrThrow<{ success: boolean; data: DevEntry[] }>(res)
      setEntries(data.data)
    } catch (e: any) {
      toast({ title: 'Failed to load entries', description: e.message || 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [range.end, range.start, toast])

  async function loadJobs() {
    try {
      const res = await fetch('/api/timekeeping-dev/jobs', { cache: 'no-store' })
      const data = await jsonOrThrow<{ success: boolean; data: Array<{ id: string; jobNumber: string; title: string }> }>(res)
      const opts = data.data.map((j) => ({
        value: j.id,
        label: `${j.jobNumber} — ${j.title}`,
        searchText: `${j.jobNumber} ${j.title}`,
      }))
      setJobOptions(opts)
      if (!selectedJobId && opts.length > 0) setSelectedJobId(opts[0].value)
    } catch (e: any) {
      toast({ title: 'Failed to load jobs', description: e.message || 'Unknown error', variant: 'destructive' })
    }
  }

  async function loadLaborCodes() {
    try {
      const res = await fetch('/api/timekeeping-dev/labor-codes', { cache: 'no-store' })
      const data = await jsonOrThrow<{ success: boolean; data: Array<{ id: string; code: string; name: string }> }>(res)
      setPhaseOptions(
        data.data.map((c) => ({
          value: c.code,
          label: `${c.code} — ${c.name}`,
          searchText: `${c.code} ${c.name}`,
        }))
      )
    } catch (e: any) {
      toast({ title: 'Failed to load labor codes', description: e.message || 'Unknown error', variant: 'destructive' })
    }
  }

  useEffect(() => {
    void loadEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, range.start.getTime(), range.end.getTime()])

  useEffect(() => {
    void loadJobs()
    void loadLaborCodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createEntry() {
    const rounded24 = parseUserTimeTo24(draftStartTime)
    if (!rounded24) {
      toast({ title: 'Invalid start time', description: 'Examples: 1200, 9:30, 1:15pm', variant: 'destructive' })
      return
    }
    const normalized12 = convert24To12Hour(rounded24)
    if (normalized12 !== draftStartTime) setDraftStartTime(normalized12)

    const [hh, mm] = rounded24.split(':').map((x) => Number(x))
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
      toast({ title: 'Invalid start time', description: 'Examples: 1200, 9:30, 1:15pm', variant: 'destructive' })
      return
    }
    const startIso = new Date(currentDate)
    startIso.setHours(hh, mm, 0, 0)

    const normalizedHours = clampHours(draftHours)
    if (!normalizedHours) {
      toast({ title: 'Invalid hours', description: 'Examples: 0.25, 1.5, 15m, 1:15', variant: 'destructive' })
      return
    }
    if (normalizedHours !== draftHours) setDraftHours(normalizedHours)
    const hours = Number(normalizedHours)
    if (!Number.isFinite(hours) || hours <= 0) {
      toast({ title: 'Invalid hours', description: 'Examples: 0.25, 1.5, 15m, 1:15', variant: 'destructive' })
      return
    }
    if (!selectedJobId) {
      toast({ title: 'Pick a job', description: 'Select a job before adding a row.', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/timekeeping-dev/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: currentDayKey,
          jobId: selectedJobId,
          startTime: startIso.toISOString(),
          hoursWorked: hours,
          phaseCode: draftPhase || null,
          notes: draftDesc || null,
        }),
      })
      const created = await jsonOrThrow<{ success: boolean; data: DevEntry }>(res)
      setDraftDesc('')
      // Optimistic add when day view matches current day; otherwise reload range
      setEntries((prev) => [...prev, created.data].sort((a, b) => a.startTime.localeCompare(b.startTime)))
      // Advance start time to next 15-min block for rapid entry.
      try {
        const rounded = new Date(created.data.startTime)
        if (!Number.isNaN(rounded.getTime())) {
          rounded.setMinutes(rounded.getMinutes() + 15, 0, 0)
          setDraftStartTime(formatTime12Hour(rounded))
        }
      } catch {
        // ignore
      }
      requestAnimationFrame(() => startTimeRef.current?.focus())
    } catch (e: any) {
      toast({ title: 'Failed to create entry', description: e.message || 'Unknown error', variant: 'destructive' })
    }
  }

  async function patchEntry(
    id: string,
    patch: Partial<Pick<DevEntry, 'startTime' | 'endTime' | 'hoursWorked' | 'notes' | 'phaseCode' | 'jobId'>>
  ) {
    const res = await fetch(`/api/timekeeping-dev/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const updated = await jsonOrThrow<{ success: boolean; data: DevEntry }>(res)
    setEntries((prev) => prev.map((e) => (e.id === id ? updated.data : e)))
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/timekeeping-dev/entries/${id}`, { method: 'DELETE' })
    await jsonOrThrow(res)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  async function runImport(file: File) {
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/timekeeping-dev/import', { method: 'POST', body: fd })
      const payload = (await res.json().catch(() => null)) as any
      if (!res.ok) {
        const detected = payload?.details?.detectedHeaders
        const normalized = payload?.details?.normalizedHeaders
        const extra =
          detected || normalized
            ? `\n\nDetected headers: ${JSON.stringify(detected)}\nNormalized: ${JSON.stringify(normalized)}`
            : ''
        const msg = payload?.error || payload?.message || `Import failed (${res.status})`
        throw new Error(`${msg}${extra}`)
      }

      const inserted = payload?.data?.inserted ?? 0
      const rejected = payload?.data?.rejected ?? 0
      const topErrors = Array.isArray(payload?.data?.errors) ? payload.data.errors.slice(0, 6) : []
      const errSummary =
        rejected > 0 && topErrors.length
          ? `\nTop rejects:\n${topErrors.map((e: any) => `Line ${e?.line ?? '?'}: ${e?.reason ?? 'Rejected'}`).join('\n')}`
          : ''

      toast({
        title: rejected > 0 ? 'Import completed with rejects' : 'Import complete',
        description: `Inserted ${inserted}, rejected ${rejected}${errSummary}`,
        variant: rejected > 0 ? 'destructive' : undefined,
      })
      await loadEntries()
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message || 'Unknown error', variant: 'destructive' })
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

  const entriesByDay = useMemo(() => {
    const map = new Map<string, DevEntry[]>()
    for (const e of entries) {
      const k = isoDateOnly(new Date(e.startTime))
      const arr = map.get(k) || []
      arr.push(e)
      map.set(k, arr)
    }
    Array.from(map.entries()).forEach(([k, arr]: [string, DevEntry[]]) => {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
      map.set(k, arr)
    })
    return map
  }, [entries])

  const navigate = (dir: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      if (viewMode === 'day') return startOfDay(dir === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
      if (viewMode === 'week') return dir === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
      return dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    })
  }

  const goToToday = () => setCurrentDate(startOfDay(new Date()))

  // Accepts: "1200", "930", "12", "12:00", "12pm", "1:15pm", "1:15 PM"
  // Returns a normalized 12-hour display string like "12:00 PM", or '' if empty/invalid.
  const normalizeTimeInput = (raw: string): string => {
    const s = raw.trim()
    if (!s) return ''

    // Digits-only shorthand, e.g. 930 -> 9:30, 1200 -> 12:00
    const digitsOnly = s.match(/^(\d{3,4})$/)
    if (digitsOnly) {
      const d = digitsOnly[1]
      const hoursPart = d.slice(0, d.length - 2)
      const minutesPart = d.slice(-2)
      const h = Number(hoursPart)
      const m = Number(minutesPart)
      if (!Number.isFinite(h) || !Number.isFinite(m)) return s
      if (h < 1 || h > 12 || m < 0 || m > 59) return s
      const t24 = convert12To24Hour(`${h}:${String(m).padStart(2, '0')}`)
      const rounded24 = roundTimeString(t24)
      return convert24To12Hour(rounded24)
    }

    // 12-hour with optional minutes and optional period.
    // Examples: "12", "12:00", "12pm", "12:15 PM"
    const m1 = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([aApP][mM])?$/)
    if (m1) {
      const h = Number(m1[1])
      const minRaw = m1[2]
      const m = minRaw === undefined ? 0 : Number(minRaw)
      const period = m1[3] ? m1[3].toUpperCase() : ''
      if (!Number.isFinite(h) || !Number.isFinite(m)) return s
      if (h < 1 || h > 12 || m < 0 || m > 59) return s
      const t12 = `${h}:${String(m).padStart(2, '0')}${period ? ` ${period}` : ''}`
      const t24 = convert12To24Hour(t12)
      const rounded24 = roundTimeString(t24)
      return convert24To12Hour(rounded24)
    }

    return s
  }

  // Convert a user-entered time string into 24h "HH:MM". Returns '' if invalid.
  const parseUserTimeTo24 = (raw: string): string => {
    const normalized12 = normalizeTimeInput(raw)
    if (!normalized12) return ''
    const t24 = convert12To24Hour(normalized12)
    return roundTimeString(t24)
  }

  const bumpHours = (delta: number) => {
    const n = Number(draftHours || 0)
    const next = (Number.isFinite(n) ? n : 0) + delta
    setDraftHours(String(Math.max(0, Math.round(next * 100) / 100)))
  }

  return (
    <DashboardPageShell title="Timekeeping Dev" description="Fast job-linked time entry (optimized for speed).">
      <Card className="flex flex-col min-h-[calc(100vh-220px)]">
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Timekeeping Dev
              </CardTitle>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.xlsm,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
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
                  className="h-9 px-3 rounded-md"
                  size="sm"
                >
                  {importing ? <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" /> : <Upload className="h-4 w-4 sm:mr-2" />}
                  <span className="hidden sm:inline">{importing ? 'Importing…' : 'Import .xlsx'}</span>
                  <span className="sm:hidden">Import</span>
                </Button>

                <Button
                  onClick={() => requestAnimationFrame(() => startTimeRef.current?.focus())}
                  className="h-9 px-3 rounded-md bg-green-600 hover:bg-green-700 active:bg-green-800 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Time</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week' | 'month')} className="w-full sm:w-auto">
                <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <TabsTrigger
                    value="day"
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md min-h-[44px] sm:min-h-[36px]"
                  >
                    Day
                  </TabsTrigger>
                  <TabsTrigger
                    value="week"
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md min-h-[44px] sm:min-h-[36px]"
                  >
                    Week
                  </TabsTrigger>
                  <TabsTrigger
                    value="month"
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md min-h-[44px] sm:min-h-[36px]"
                  >
                    Month
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('prev')}
                  className="flex-1 sm:flex-initial h-9 rounded-md"
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="flex-1 sm:flex-initial h-9 rounded-md"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('next')}
                  className="flex-1 sm:flex-initial h-9 rounded-md"
                >
                  Next
                </Button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="text-sm sm:text-base font-semibold text-gray-900 px-3 py-2 text-center sm:text-left bg-gray-50 rounded-md border border-gray-200">
                  {viewMode === 'day'
                    ? format(currentDate, 'EEE, MMM d, yyyy')
                    : viewMode === 'week'
                      ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'M/d')} - ${format(
                          endOfWeek(currentDate, { weekStartsOn: 0 }),
                          'M/d'
                        )}`
                      : format(currentDate, 'MMMM yyyy')}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading entries…</p>
            </div>
          ) : (
            <Tabs value={viewMode} className="mt-2 flex-1 min-h-0 flex flex-col">
              <TabsContent value="day" className="space-y-2 h-full flex flex-col">
                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-muted-foreground">
                      Day: <span className="font-mono text-foreground">{dailyTotal.toFixed(2)}</span>h
                    </div>
                    <div className="text-muted-foreground">
                      Week: <span className="font-mono text-foreground">{weeklyTotal.toFixed(2)}</span>h
                    </div>
                    <div className="text-muted-foreground">
                      Rows: <span className="font-mono text-foreground">{(entriesByDay.get(currentDayKey) || []).length}</span>
                    </div>
                  </div>
                </div>

                {/* Add entry panel (separate from list for clarity) */}
                <div className="rounded-md border border-green-200 bg-green-50/60 p-3">
                  <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-green-800 mb-2">Add time entry</div>
                      <div className="grid grid-cols-1 sm:grid-cols-[320px_110px_84px_120px_minmax(320px,1fr)_auto] gap-2 items-end">
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-muted-foreground mb-1">Add job</div>
                          <SearchableSelect
                            options={jobOptions}
                            value={selectedJobId}
                            onValueChange={setSelectedJobId}
                            placeholder={jobOptions.length ? 'Select a job…' : 'Loading jobs…'}
                            emptyMessage="No jobs found."
                            className="w-full"
                            dense
                          />
                        </div>

                        <div>
                          <div className="text-[11px] font-medium text-muted-foreground mb-1">Start</div>
                          <Input
                            ref={startTimeRef}
                            value={draftStartTime}
                            onChange={(e) => setDraftStartTime(e.target.value)}
                            placeholder="1200"
                            className="h-9 font-mono w-[112px]"
                            inputMode="numeric"
                            onBlur={() => {
                              const normalized = normalizeTimeInput(draftStartTime)
                              if (!normalized) return
                              setDraftStartTime(normalized)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const normalized = normalizeTimeInput(draftStartTime)
                                if (normalized) setDraftStartTime(normalized)
                                requestAnimationFrame(() => hoursRef.current?.focus())
                              }
                            }}
                          />
                        </div>

                        <div>
                          <div className="text-[11px] font-medium text-muted-foreground mb-1">Hours</div>
                          <Input
                            ref={hoursRef}
                            value={draftHours}
                            onChange={(e) => setDraftHours(e.target.value)}
                            className="h-9 w-[80px]"
                            inputMode="decimal"
                            placeholder="0.25"
                            onBlur={() => {
                              const v = clampHours(draftHours)
                              if (!v) return
                              setDraftHours(v)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const v = clampHours(draftHours)
                                if (v) setDraftHours(v)
                                void createEntry()
                              }
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-muted-foreground mb-1">Phase</div>
                          <SearchableSelect
                            options={phaseOptions}
                            value={draftPhase}
                            onValueChange={setDraftPhase}
                            getTriggerLabel={(opt) => opt.value}
                            placeholder="—"
                            emptyMessage="No phases found."
                            className="w-full"
                            dense
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-muted-foreground mb-1">Notes</div>
                          <Input
                            ref={notesRef}
                            value={draftDesc}
                            onChange={(e) => setDraftDesc(e.target.value)}
                            placeholder="Notes (optional)"
                            className="h-9"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void createEntry()
                            }}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button onClick={() => void createEntry()} size="sm" className="h-9 px-3 w-full sm:w-auto">
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border flex-1 min-h-0 flex flex-col overflow-hidden">
                  <Table className="min-w-[900px]" wrapperClassName="flex-1 min-h-0 h-full">
                    <TableHeader className="sticky top-0 z-20 bg-background">
                      <TableRow>
                        <TableHead className="w-[320px] bg-background">Job</TableHead>
                        <TableHead className="w-[110px] bg-background">Start</TableHead>
                        <TableHead className="w-[88px] bg-background">Hours</TableHead>
                        <TableHead className="w-[140px] bg-background">Phase</TableHead>
                        <TableHead className="bg-background">Notes</TableHead>
                        <TableHead className="w-[88px] text-right bg-background">{''}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(entriesByDay.get(currentDayKey) || []).map((e) => {
                        const start = new Date(e.startTime)
                        const startLabel = Number.isNaN(start.getTime()) ? '' : formatTime12Hour(start)
                        return (
                          <TableRow key={e.id}>
                            <TableCell>
                              <SearchableSelect
                                options={jobOptions}
                                value={e.jobId || ''}
                                onValueChange={(jobId) => void patchEntry(e.id, { jobId })}
                                placeholder="Select…"
                                emptyMessage="No jobs found."
                                className="w-full"
                                dense
                              />
                            </TableCell>
                            <TableCell className="font-mono">
                              <Input
                                defaultValue={startLabel}
                                className="h-9 w-full font-mono"
                                placeholder="1200"
                                inputMode="numeric"
                                onBlur={(ev) => {
                                  const rounded24 = parseUserTimeTo24(ev.target.value)
                                  if (!rounded24) return
                                  ev.target.value = convert24To12Hour(rounded24)
                                  const dt = new Date(e.startTime)
                                  const [hh, mm] = rounded24.split(':').map(Number)
                                  dt.setHours(hh, mm, 0, 0)
                                  void patchEntry(e.id, { startTime: dt.toISOString() })
                                }}
                                onKeyDown={(ev) => {
                                  if (ev.key === 'Enter') ev.currentTarget.blur()
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={String(e.hoursWorked)}
                                className="h-9"
                                placeholder="0.25"
                                onKeyDown={(ev) => {
                                  if (ev.key === 'Enter') {
                                    ev.currentTarget.blur()
                                  }
                                }}
                                onBlur={(ev) => {
                                  const v = clampHours(ev.target.value)
                                  if (!v) return
                                  ev.target.value = v
                                  void patchEntry(e.id, { hoursWorked: v })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <SearchableSelect
                                options={phaseOptions}
                                value={e.phaseCode || ''}
                                onValueChange={(phaseCode) => void patchEntry(e.id, { phaseCode: phaseCode || null })}
                                getTriggerLabel={(opt) => opt.value}
                                placeholder="—"
                                emptyMessage="No phases found."
                                className="w-full"
                                dense
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={e.notes || ''}
                                className="h-9"
                                placeholder="Notes"
                                onKeyDown={(ev) => {
                                  if (ev.key === 'Enter') {
                                    requestAnimationFrame(() => startTimeRef.current?.focus())
                                  }
                                }}
                                onBlur={(ev) => void patchEntry(e.id, { notes: ev.target.value })}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="destructive" size="sm" className="h-9 px-3" onClick={() => void deleteEntry(e.id)}>
                                Del
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {(entriesByDay.get(currentDayKey) || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                            No entries for this day yet.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="week" className="space-y-4">
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
                    const total = dayEntries.reduce((sum, e) => sum + (Number(e.hoursWorked) || 0), 0)
                    const isToday = isSameDay(day, new Date())
                    return (
                      <div
                        key={k}
                        className={`min-h-[200px] border-2 rounded-lg p-2 transition-colors cursor-pointer ${
                          isToday ? 'border-green-400 bg-green-50/30' : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/20'
                        }`}
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
                            {dayEntries.slice(0, 6).map((e) => (
                              <div key={e.id} className="text-xs p-1.5 border rounded bg-green-100 border-green-200">
                                <div className="font-medium text-green-800">
                                  {format(new Date(e.startTime), 'h:mm a')} • {Number(e.hoursWorked).toFixed(2)}h
                                </div>
                                <div className="text-xs text-gray-600 mt-1 truncate">
                                  {(e.job?.jobNumber || '—')} {e.notes ? `• ${e.notes}` : ''}
                                </div>
                              </div>
                            ))}
                            {dayEntries.length > 6 ? (
                              <div className="text-xs text-green-700 font-medium text-center">+{dayEntries.length - 6} more</div>
                            ) : null}
                          </div>
                        )}
                        {total > 0 ? (
                          <div className="mt-2 pt-2 border-t border-gray-300">
                            <div className="text-xs font-bold text-green-700 text-center">{total.toFixed(2)}h</div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="month" className="space-y-4">
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                    <div key={label} className="text-center font-semibold text-gray-700 py-2 text-xs sm:text-sm border-b border-gray-200">
                      {label}
                    </div>
                  ))}

                  {calendarDays.map((day) => {
                    const k = isoDateOnly(day)
                    const dayEntries = entriesByDay.get(k) || []
                    const total = dayEntries.reduce((sum, e) => sum + (Number(e.hoursWorked) || 0), 0)
                    const today = isSameDay(day, new Date())
                    const currentMonth = isSameMonth(day, currentDate)
                    return (
                      <div
                        key={k}
                        onClick={() => {
                          setCurrentDate(startOfDay(day))
                          setViewMode('day')
                        }}
                        className={`min-h-[70px] sm:min-h-[90px] p-2 border rounded-lg cursor-pointer transition-all ${
                          today ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30'
                        } ${!currentMonth ? 'opacity-40' : ''}`}
                      >
                        <div className={`text-xs sm:text-sm font-medium mb-1 ${today ? 'text-green-600 font-bold' : 'text-gray-700'}`}>
                          {format(day, 'd')}
                        </div>
                        {total > 0 ? (
                          <div className="text-[10px] sm:text-xs font-bold text-green-700 text-center">{total.toFixed(1)}h</div>
                        ) : (
                          <div className="text-[10px] sm:text-xs text-gray-400 text-center">{dayEntries.length ? `${dayEntries.length} rows` : ''}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}

