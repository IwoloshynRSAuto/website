'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActiveJobsPanel } from './active-jobs-panel'
import { MachineShopPanel } from './machine-shop-panel'

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfWeek(d: Date) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(e.getDate() + 6)
  e.setHours(23, 59, 59, 999)
  return e
}

function startOfMonth(d: Date) {
  const x = new Date(d)
  x.setDate(1)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0)
}

function endOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  const lastMonth = q * 3 + 2
  return new Date(d.getFullYear(), lastMonth + 1, 0, 23, 59, 59, 999)
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
}

function endOfYear(d: Date) {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
}

type RangePreset = 'month' | 'quarter' | 'year' | 'week' | 'custom'

const RANGE_MIN_SPAN_MS = 2 * 86_400_000
const YEAR_PAD_DAYS = 7

function applyRangePreset(p: Exclude<RangePreset, 'custom'>): { start: Date; end: Date } {
  const now = new Date()
  if (p === 'month') {
    const start = startOfMonth(now)
    return { start, end: endOfMonth(now) }
  }
  if (p === 'quarter') {
    const start = startOfQuarter(now)
    return { start, end: endOfQuarter(now) }
  }
  if (p === 'week') {
    return { start: startOfWeek(now), end: endOfWeek(now) }
  }
  if (p === 'year') {
    // Add padding so Year view feels “zoomed out” without horizontal scrolling.
    const start = startOfYear(now)
    const end = endOfYear(now)
    const s = new Date(start)
    s.setDate(s.getDate() - YEAR_PAD_DAYS)
    const e = new Date(end)
    e.setDate(e.getDate() + YEAR_PAD_DAYS)
    return { start: s, end: e }
  }
  return { start: startOfYear(now), end: endOfYear(now) }
}

function normalizeRangeBounds(start: Date, end: Date): { start: Date; end: Date } {
  let s = new Date(start)
  let e = new Date(end)
  if (e.getTime() <= s.getTime()) {
    e = new Date(s)
    e.setDate(e.getDate() + 13)
    e.setHours(23, 59, 59, 999)
    return { start: s, end: e }
  }
  if (e.getTime() - s.getTime() < RANGE_MIN_SPAN_MS) {
    e = new Date(s)
    e.setDate(e.getDate() + 13)
    e.setHours(23, 59, 59, 999)
    return { start: s, end: e }
  }
  return { start: s, end: e }
}

function toDateInputValue(d: Date) {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateInputLocal(isoDate: string, endOfDay: boolean) {
  const [y, mo, da] = isoDate.split('-').map(Number)
  if (!y || !mo || !da) return null
  const d = new Date(y, mo - 1, da, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
  return d
}

export function SchedulingApp() {
  const [rangePreset, setRangePreset] = useState<RangePreset>('quarter')
  const [rangeStart, setRangeStart] = useState(() => applyRangePreset('quarter').start)
  const [rangeEnd, setRangeEnd] = useState(() => applyRangePreset('quarter').end)
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable')

  const setPreset = (p: Exclude<RangePreset, 'custom'>) => {
    setRangePreset(p)
    const { start, end } = applyRangePreset(p)
    setRangeStart(start)
    setRangeEnd(end)
  }

  const pixelsPerDay =
    rangePreset === 'week' ? 34 : rangePreset === 'month' ? 22 : rangePreset === 'quarter' ? 14 : rangePreset === 'year' ? 6 : 14

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">Jobs and shop resources.</p>
      </div>

      <details className="rounded-lg border bg-card px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium text-foreground select-none">Tips</summary>
        <ul className="list-disc pl-4 mt-2 space-y-1 text-muted-foreground">
          <li>Active jobs: click a bar to set start and target end (job owner or admin).</li>
          <li>Deliverable deadlines are configured on each job; they show as purple lines on the job row.</li>
          <li>Machine shop: book windows on this page; add or edit machine rows under Admin → Machine shop.</li>
        </ul>
      </details>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Visible range</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Applies to both tabs below.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border bg-background overflow-hidden mr-1">
              <Button
                type="button"
                size="sm"
                className="rounded-none h-8"
                variant={density === 'compact' ? 'default' : 'ghost'}
                onClick={() => setDensity('compact')}
              >
                Compact
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-none h-8"
                variant={density === 'comfortable' ? 'default' : 'ghost'}
                onClick={() => setDensity('comfortable')}
              >
                Comfortable
              </Button>
            </div>
            <Button
              type="button"
              variant={rangePreset === 'week' ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => {
                setPreset('week')
              }}
            >
              Week
            </Button>
            <Button
              type="button"
              variant={rangePreset === 'month' ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => {
                setPreset('month')
              }}
            >
              Month
            </Button>
            <Button
              type="button"
              variant={rangePreset === 'quarter' ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => {
                setPreset('quarter')
              }}
            >
              Quarter
            </Button>
            <Button
              type="button"
              variant={rangePreset === 'year' ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => {
                setPreset('year')
              }}
            >
              Year
            </Button>
            <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
            <div className="flex items-end gap-2">
              <div className="w-[140px]">
                <div className="text-[11px] font-medium text-muted-foreground mb-1">From</div>
                <Input
                  type="date"
                  className="h-9"
                  value={toDateInputValue(rangeStart)}
                  onChange={(e) => {
                    const d = parseDateInputLocal(e.target.value, false)
                    if (!d) return
                    setRangePreset('custom')
                    const next = normalizeRangeBounds(d, rangeEnd)
                    setRangeStart(next.start)
                    setRangeEnd(next.end)
                  }}
                />
              </div>
              <div className="w-[140px]">
                <div className="text-[11px] font-medium text-muted-foreground mb-1">To</div>
                <Input
                  type="date"
                  className="h-9"
                  value={toDateInputValue(rangeEnd)}
                  onChange={(e) => {
                    const d = parseDateInputLocal(e.target.value, true)
                    if (!d) return
                    setRangePreset('custom')
                    const next = normalizeRangeBounds(rangeStart, d)
                    setRangeStart(next.start)
                    setRangeEnd(next.end)
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-[11px] text-muted-foreground">
            Same-day or one-day ranges are expanded to two weeks so charts stay readable.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="portfolio" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="portfolio">Active jobs</TabsTrigger>
          <TabsTrigger value="machines">Machine shop</TabsTrigger>
        </TabsList>
        <TabsContent value="portfolio" className="mt-4 space-y-4">
          <ActiveJobsPanel rangeStart={rangeStart} rangeEnd={rangeEnd} pixelsPerDay={pixelsPerDay} rangePreset={rangePreset} density={density} />
        </TabsContent>
        <TabsContent value="machines" className="mt-4 space-y-4">
          <MachineShopPanel
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            pixelsPerDay={pixelsPerDay}
            rangePreset={rangePreset}
            onRangePresetChange={(p) => setPreset(p)}
            density={density}
            showBookings
            showMachineManagement={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
