'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Wrench, Building2, Search, Loader2, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { dashboardUi } from '@/components/layout/dashboard-ui'
import { CreateJobButton } from '@/components/jobs/create-job-button'

const PAGE_SIZE = 500

interface JobRow {
  id: string
  jobNumber: string
  title: string
  status: string
  createdAt: string
  customer?: { id: string; name: string } | null
}

export function JobsDevBoard() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState<'active' | 'completed' | 'cancelled'>('active')

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const allRows: JobRow[] = []
      let page = 1
      let totalPages = 1

      do {
        const params = new URLSearchParams({
          type: 'JOB',
          limit: String(PAGE_SIZE),
          page: String(page),
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
        const res = await fetch(`/api/jobs?${params}`)
        if (!res.ok) throw new Error('Failed to load jobs')
        const data = await res.json()
        const batch = (data.jobs || []) as JobRow[]
        totalPages = Math.max(1, data.pagination?.totalPages ?? 1)
        for (const j of batch) {
          allRows.push({
            ...j,
            createdAt:
              typeof j.createdAt === 'string'
                ? j.createdAt
                : new Date(j.createdAt as unknown as Date).toISOString(),
          })
        }
        page += 1
        if (batch.length === 0) break
      } while (page <= totalPages)

      setJobs(allRows)
    } catch {
      toast({ title: 'Could not load jobs', variant: 'destructive' })
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const searchNorm = searchQuery.trim().toLowerCase()
  const bySearch = (list: JobRow[]) =>
    !searchNorm
      ? list
      : list.filter(
          (j) =>
            j.jobNumber.toLowerCase().includes(searchNorm) ||
            j.title.toLowerCase().includes(searchNorm) ||
            (j.customer?.name || '').toLowerCase().includes(searchNorm)
        )

  const activeJobs = useMemo(
    () => jobs.filter((j) => !['COMPLETED', 'CANCELLED'].includes(j.status)),
    [jobs]
  )
  const completedJobs = useMemo(() => jobs.filter((j) => j.status === 'COMPLETED'), [jobs])
  const cancelledJobs = useMemo(() => jobs.filter((j) => j.status === 'CANCELLED'), [jobs])

  const activeF = bySearch(activeJobs)
  const completedF = bySearch(completedJobs)
  const cancelledF = bySearch(cancelledJobs)

  const tabMeta = {
    active: {
      label: 'Active',
      short: 'Planned, active, or on hold',
      count: activeF.length,
      accent: 'border-l-amber-500 bg-amber-50/90 text-amber-950',
    },
    completed: {
      label: 'Completed',
      short: 'Finished jobs',
      count: completedF.length,
      accent: 'border-l-emerald-500 bg-emerald-50/90 text-emerald-950',
    },
    cancelled: {
      label: 'Cancelled',
      short: 'Cancelled jobs',
      count: cancelledF.length,
      accent: 'border-l-rose-500 bg-rose-50/90 text-rose-950',
    },
  } as const

  const viewing = tabMeta[tab]

  const statusBadge = (s: string) => {
    const cls =
      s === 'ACTIVE'
        ? 'bg-green-100 text-green-800'
        : s === 'PLANNED'
          ? 'bg-blue-100 text-blue-800'
          : s === 'ON_HOLD'
            ? 'bg-amber-100 text-amber-900'
            : s === 'COMPLETED'
              ? 'bg-slate-200 text-slate-800'
              : s === 'CANCELLED'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-700'
    return <Badge className={cn('font-medium', cls)}>{s.replace(/_/g, ' ')}</Badge>
  }

  const renderTable = (list: JobRow[]) =>
    list.length === 0 ? (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center text-sm text-gray-500">
        No jobs in this view{searchNorm ? ' matching your search' : ''}.
      </div>
    ) : (
      <div className="max-h-[min(70vh,720px)] overflow-auto rounded-md border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(dashboardUi.tableHead)}>Job</TableHead>
              <TableHead className={cn(dashboardUi.tableHead)}>Title</TableHead>
              <TableHead className={cn(dashboardUi.tableHead)}>Customer</TableHead>
              <TableHead className={cn(dashboardUi.tableHead)}>Status</TableHead>
              <TableHead className={cn(dashboardUi.tableHead, 'whitespace-nowrap')}>Created</TableHead>
              <TableHead className={cn(dashboardUi.tableHead, 'text-right')}>Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((job) => (
              <TableRow key={job.id} className="text-sm">
                <TableCell className="py-2 px-3 font-medium tabular-nums">
                  <Link href={`/dashboard/jobs/${job.id}`} className="text-blue-600 hover:underline">
                    {job.jobNumber}
                  </Link>
                </TableCell>
                <TableCell className="py-2 px-3 max-w-[min(28vw,280px)]">
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="line-clamp-2 text-left font-medium text-blue-700 hover:text-blue-900 hover:underline"
                    title={job.title}
                  >
                    {job.title}
                  </Link>
                </TableCell>
                <TableCell className="py-2 px-3 text-gray-600 max-w-[min(24vw,200px)]">
                  <span className="inline-flex items-center gap-1 truncate" title={job.customer?.name}>
                    {job.customer?.name ? (
                      <>
                        <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{job.customer.name}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </TableCell>
                <TableCell className="py-2 px-3">{statusBadge(job.status)}</TableCell>
                <TableCell className="py-2 px-3 text-gray-500 whitespace-nowrap text-xs">
                  {format(new Date(job.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="py-2 px-3 text-right">
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Details
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )

  return (
    <div className="space-y-5">
      <div className={dashboardUi.toolbarRow}>
        <div className={dashboardUi.searchInputWrap}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by job number, title, customer…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
            aria-label="Search jobs"
          />
        </div>
        <CreateJobButton variant="job" label="Add job" className="w-full sm:w-auto shrink-0" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading jobs…
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <TabsList className={dashboardUi.tabsList}>
            <TabsTrigger
              value="active"
              className={cn(
                'group gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium transition-all',
                'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                'data-[state=active]:border-amber-200 data-[state=active]:bg-white data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-amber-400/40'
              )}
            >
              <Wrench className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{tabMeta.active.label}</span>
              <Badge
                variant="secondary"
                className="ml-0.5 min-w-[2rem] justify-center tabular-nums bg-slate-200/80 text-slate-800 group-data-[state=active]:bg-amber-100 group-data-[state=active]:text-amber-900"
              >
                {activeF.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className={cn(
                'group gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium transition-all',
                'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                'data-[state=active]:border-emerald-200 data-[state=active]:bg-white data-[state=active]:text-emerald-950 data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-emerald-400/40'
              )}
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="whitespace-nowrap">{tabMeta.completed.label}</span>
              <Badge
                variant="secondary"
                className="ml-0.5 min-w-[2rem] justify-center tabular-nums bg-slate-200/80 text-slate-800 group-data-[state=active]:bg-emerald-100 group-data-[state=active]:text-emerald-900"
              >
                {completedF.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="cancelled"
              className={cn(
                'group gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium transition-all',
                'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                'data-[state=active]:border-rose-200 data-[state=active]:bg-white data-[state=active]:text-rose-950 data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-rose-400/40'
              )}
            >
              <XCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span className="whitespace-nowrap">{tabMeta.cancelled.label}</span>
              <Badge
                variant="secondary"
                className="ml-0.5 min-w-[2rem] justify-center tabular-nums bg-slate-200/80 text-slate-800 group-data-[state=active]:bg-rose-100 group-data-[state=active]:text-rose-900"
              >
                {cancelledF.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <Card className="mt-3 overflow-hidden border border-slate-200 shadow-md">
            <CardHeader className={cn('border-b py-3 px-4 border-l-4', viewing.accent)}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Current filter</p>
              <p className="text-base font-semibold text-slate-900">
                {viewing.label}
                <span className="text-slate-500 font-normal">
                  {' '}
                  — {viewing.count} job{viewing.count === 1 ? '' : 's'}
                </span>
              </p>
              <p className="text-sm text-slate-600">{viewing.short}</p>
            </CardHeader>
            <CardContent className="p-4">
              <TabsContent value="active" className="mt-0 focus-visible:outline-none">
                {renderTable(activeF)}
              </TabsContent>
              <TabsContent value="completed" className="mt-0 focus-visible:outline-none">
                {renderTable(completedF)}
              </TabsContent>
              <TabsContent value="cancelled" className="mt-0 focus-visible:outline-none">
                {renderTable(cancelledF)}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      )}
    </div>
  )
}
