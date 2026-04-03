'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  CheckCircle,
  XCircle,
  RotateCcw,
  Wrench,
  Building2,
  Loader2,
  Plus,
  Briefcase,
  Search,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description: string | null
  customerId: string | null
  customerName: string | null
  amount: number
  status: string
  createdAt: string
  updatedAt: string
  validUntil: string | null
  job?: {
    id: string
    jobNumber: string
    title: string
  } | null
}

interface QuotesKanbanBoardProps {
  initialQuotes: Quote[]
  /** Load from /api/quotes on mount (e.g. embedded on Jobs page with no SSR data). */
  fetchOnMount?: boolean
  /** Tighter layout when nested under Jobs & Quotes. */
  embedded?: boolean
}

type CustomerOption = { id: string; name: string }

export function QuotesKanbanBoard({ initialQuotes, fetchOnMount = false, embedded = false }: QuotesKanbanBoardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const [loadingQuotes, setLoadingQuotes] = useState<Set<string>>(new Set())
  const [convertingQuotes, setConvertingQuotes] = useState<Set<string>>(new Set())
  const [pipelineTab, setPipelineTab] = useState<'draft' | 'approved' | 'cancelled'>('draft')
  const [searchQuery, setSearchQuery] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newQuoteNumber, setNewQuoteNumber] = useState('')
  const [newCustomerId, setNewCustomerId] = useState<string>('')
  const [newAmount, setNewAmount] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newValidUntil, setNewValidUntil] = useState('')

  useEffect(() => {
    if (!createOpen) return
    void (async () => {
      try {
        const response = await fetch('/api/customers')
        if (!response.ok) return
        const result = await response.json()
        const data = result.data || (Array.isArray(result) ? result : [])
        setCustomers(Array.isArray(data) ? data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : [])
      } catch {
        setCustomers([])
      }
    })()
  }, [createOpen])

  const resetCreateForm = () => {
    setNewTitle('')
    setNewQuoteNumber('')
    setNewCustomerId('')
    setNewAmount('')
    setNewDescription('')
    setNewValidUntil('')
  }

  const handleCreateQuote = async () => {
    const title = newTitle.trim()
    if (!title) {
      toast({
        title: 'Title required',
        description: 'Enter a title for the quote.',
        variant: 'destructive',
      })
      return
    }

    setCreateSubmitting(true)
    try {
      const amountNum = newAmount.trim() === '' ? 0 : parseFloat(newAmount)
      const body: Record<string, unknown> = {
        title,
        description: newDescription.trim() || null,
        customerId: newCustomerId && newCustomerId !== '__none__' ? newCustomerId : null,
        amount: Number.isFinite(amountNum) ? Math.max(0, amountNum) : 0,
        validUntil: newValidUntil.trim() || null,
      }
      const qn = newQuoteNumber.trim()
      if (qn) body.quoteNumber = qn

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to create quote')
      }

      toast({ title: 'Quote created', description: `${data.data?.quoteNumber ?? ''} added to the pipeline.` })
      resetCreateForm()
      setCreateOpen(false)
      await loadQuotes()
      router.refresh()
    } catch (e) {
      toast({
        title: 'Could not create quote',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setCreateSubmitting(false)
    }
  }

  /** Pipeline tabs: everything not approved/won or cancelled/lost shows under Draft */
  const cancelledQuotes = quotes.filter(q => ['CANCELLED', 'LOST'].includes(q.status))
  const approvedQuotes = quotes.filter(q => ['APPROVED', 'WON'].includes(q.status))
  const draftQuotes = quotes.filter(
    q => !['APPROVED', 'WON', 'CANCELLED', 'LOST'].includes(q.status)
  )

  const searchNorm = searchQuery.trim().toLowerCase()
  const bySearch = (list: Quote[]) =>
    !searchNorm
      ? list
      : list.filter(
          (q) =>
            q.quoteNumber.toLowerCase().includes(searchNorm) ||
            q.title.toLowerCase().includes(searchNorm) ||
            (q.customerName || '').toLowerCase().includes(searchNorm)
        )

  const draftFiltered = bySearch(draftQuotes)
  const approvedFiltered = bySearch(approvedQuotes)
  const cancelledFiltered = bySearch(cancelledQuotes)

  const loadQuotes = useCallback(async () => {
    try {
      const response = await fetch('/api/quotes')
      if (!response.ok) throw new Error('Failed to load quotes')
      const data = await response.json()
      if (data.success) {
        const rows = data.data || []
        setQuotes(
          rows.map((q: Record<string, unknown>) => ({
            ...q,
            createdAt:
              typeof q.createdAt === 'string'
                ? q.createdAt
                : q.createdAt instanceof Date
                  ? (q.createdAt as Date).toISOString()
                  : String(q.createdAt ?? ''),
            updatedAt:
              typeof q.updatedAt === 'string'
                ? q.updatedAt
                : q.updatedAt instanceof Date
                  ? (q.updatedAt as Date).toISOString()
                  : String(q.updatedAt ?? ''),
            status: String(q.status ?? 'DRAFT'),
          })) as Quote[]
        )
      }
    } catch (error) {
      console.error('[QuotesKanbanBoard] Error loading quotes:', error)
      toast({
        title: 'Error',
        description: 'Failed to load quotes',
        variant: 'destructive',
      })
    }
  }, [toast])

  const convertQuoteToJob = async (quoteId: string) => {
    if (convertingQuotes.has(quoteId)) return
    setConvertingQuotes((prev) => new Set(prev).add(quoteId))
    try {
      const res = await fetch(`/api/quotes/${quoteId}/convertToJob`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Failed to convert quote to job')
      }
      const jobId = data.data?.id as string | undefined
      const jobNum = data.data?.jobNumber as string | undefined
      toast({
        title: 'Job created',
        description: jobNum ? `New job ${jobNum} is linked to this quote.` : 'Quote converted to a job.',
      })
      await loadQuotes()
      router.refresh()
      if (jobId) {
        router.push(`/dashboard/jobs/${jobId}`)
      }
    } catch (e) {
      toast({
        title: 'Could not convert',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setConvertingQuotes((prev) => {
        const next = new Set(prev)
        next.delete(quoteId)
        return next
      })
    }
  }

  useEffect(() => {
    if (fetchOnMount) {
      void loadQuotes()
    }
  }, [fetchOnMount, loadQuotes])

  const updateQuoteStatus = async (quoteId: string, newStatus: 'DRAFT' | 'APPROVED' | 'CANCELLED') => {
    if (loadingQuotes.has(quoteId)) return

    setLoadingQuotes(prev => new Set(prev).add(quoteId))

    try {
      console.log('[QuotesKanbanBoard] Updating quote status:', { quoteId, newStatus })

      const response = await fetch(`/api/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('[QuotesKanbanBoard] Status update failed:', data)
        throw new Error(data.error || 'Failed to update quote status')
      }

      console.log('[QuotesKanbanBoard] Status updated successfully:', data)

      // Update local state
      setQuotes(prev =>
        prev.map(q => (q.id === quoteId ? { ...q, status: newStatus } : q))
      )

      toast({
        title: 'Success',
        description: `Quote status updated to ${newStatus}`,
      })

      // Refresh the page data
      router.refresh()
    } catch (error: any) {
      console.error('[QuotesKanbanBoard] Error updating status:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update quote status',
        variant: 'destructive',
      })
    } finally {
      setLoadingQuotes(prev => {
        const next = new Set(prev)
        next.delete(quoteId)
        return next
      })
    }
  }

  /** Row actions: solid fills, rings, min width so they read as real toolbar buttons. */
  const rowBtnPrimary =
    'min-h-9 min-w-[108px] px-4 text-sm font-semibold rounded-lg shadow-sm border border-primary/20 bg-primary text-primary-foreground ring-1 ring-primary/30 hover:bg-primary/92 hover:shadow-md hover:ring-primary/40 active:translate-y-px active:shadow-sm'
  const rowBtnNeutral =
    'min-h-9 min-w-[108px] px-4 text-sm font-semibold rounded-lg shadow-sm border border-slate-300 bg-white text-slate-900 ring-1 ring-slate-200/80 hover:bg-slate-50 hover:shadow-md active:translate-y-px'
  const rowBtnMuted =
    'min-h-9 min-w-[108px] px-4 text-sm font-semibold rounded-lg shadow-sm border border-slate-300 bg-slate-100 text-slate-900 ring-1 ring-slate-200/80 hover:bg-slate-200/80 hover:shadow-md active:translate-y-px'
  const rowBtnDanger =
    'min-h-9 min-w-[108px] px-4 text-sm font-semibold rounded-lg shadow-sm border border-destructive/30 bg-destructive text-destructive-foreground ring-1 ring-destructive/25 hover:bg-destructive/92 hover:shadow-md active:translate-y-px'

  const QuoteTableRow = ({ quote }: { quote: Quote }) => {
    const isLoading = loadingQuotes.has(quote.id)
    const isConverting = convertingQuotes.has(quote.id)
    const busy = isLoading || isConverting

    return (
      <TableRow className="text-sm">
        <TableCell className="py-2 px-3 align-middle font-medium">
          <Link href={`/dashboard/jobs/quotes/${quote.id}`} className="text-blue-600 hover:underline tabular-nums">
            {quote.quoteNumber}
          </Link>
        </TableCell>
        <TableCell className="py-2 px-3 align-middle max-w-[min(28vw,240px)]">
          <Link
            href={`/dashboard/jobs/quotes/${quote.id}`}
            className="line-clamp-2 text-left font-medium text-blue-700 hover:text-blue-900 hover:underline"
            title={quote.title}
          >
            {quote.title}
          </Link>
        </TableCell>
        <TableCell className="py-2 px-3 align-middle text-gray-600 max-w-[min(24vw,200px)]">
          <span className="inline-flex items-center gap-1 truncate" title={quote.customerName ?? ''}>
            {quote.customerName ? (
              <>
                <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{quote.customerName}</span>
              </>
            ) : (
              '—'
            )}
          </span>
        </TableCell>
        <TableCell className="py-2 px-3 align-middle text-right tabular-nums whitespace-nowrap">
          ${quote.amount.toFixed(2)}
        </TableCell>
        <TableCell className="py-2 px-3 align-middle text-gray-500 whitespace-nowrap text-xs">
          {format(new Date(quote.createdAt), 'MMM d, yyyy')}
        </TableCell>
        <TableCell className="py-2 px-3 align-middle text-xs">
          {quote.job ? (
            <Link href={`/dashboard/jobs/${quote.job.id}`} className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
              <Wrench className="h-3 w-3" />
              {quote.job.jobNumber}
            </Link>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </TableCell>
        <TableCell className="py-2 px-3 align-middle text-right">
          <div className="flex flex-wrap items-center justify-end gap-1">
            {!['APPROVED', 'WON', 'CANCELLED', 'LOST'].includes(quote.status) && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => updateQuoteStatus(quote.id, 'APPROVED')}
                  disabled={busy}
                  className={rowBtnPrimary}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => updateQuoteStatus(quote.id, 'CANCELLED')}
                  disabled={busy}
                  className={rowBtnDanger}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Cancel
                </Button>
              </>
            )}
            {['APPROVED', 'WON'].includes(quote.status) && (
              <>
                {!quote.job ? (
                  <Button
                    type="button"
                    size="sm"
                    className={rowBtnPrimary}
                    onClick={() => void convertQuoteToJob(quote.id)}
                    disabled={busy}
                  >
                    {isConverting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Convert to job
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground mr-2 rounded-md border-2 border-border px-2 py-1.5 bg-muted/50 shadow-sm">
                    Job linked
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => updateQuoteStatus(quote.id, 'CANCELLED')}
                  disabled={busy}
                  className={rowBtnDanger}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Cancel
                </Button>
              </>
            )}
            {['CANCELLED', 'LOST'].includes(quote.status) && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => updateQuoteStatus(quote.id, 'DRAFT')}
                  disabled={isLoading}
                  className={rowBtnNeutral}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Back to draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => updateQuoteStatus(quote.id, 'APPROVED')}
                  disabled={isLoading}
                  className={rowBtnPrimary}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  const renderQuoteList = (list: Quote[], tab: 'draft' | 'approved' | 'cancelled') =>
    list.length === 0 ? (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center text-sm text-gray-500">
        {searchNorm
          ? 'No quotes match your search in this tab.'
          : {
              draft: 'No quotes in draft.',
              approved: 'No approved quotes yet. Approve a draft, then convert to a job.',
              cancelled: 'No cancelled quotes.',
            }[tab]}
      </div>
    ) : (
      <div className="max-h-[min(70vh,720px)] overflow-auto rounded-md border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 py-2 px-3 text-xs font-semibold">Quote</TableHead>
              <TableHead className="h-9 py-2 px-3 text-xs font-semibold">Title</TableHead>
              <TableHead className="h-9 py-2 px-3 text-xs font-semibold">Customer</TableHead>
              <TableHead className="h-9 py-2 px-3 text-xs font-semibold text-right">Amount</TableHead>
              <TableHead className="h-9 py-2 px-3 text-xs font-semibold whitespace-nowrap">Created</TableHead>
              <TableHead className="h-9 py-2 px-3 text-xs font-semibold">Job</TableHead>
              <TableHead className="h-9 py-2 px-3 text-xs font-semibold text-right w-[min(40vw,320px)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((quote) => (
              <QuoteTableRow key={quote.id} quote={quote} />
            ))}
          </TableBody>
        </Table>
      </div>
    )

  const tabMeta: Record<
    'draft' | 'approved' | 'cancelled',
    { label: string; short: string; count: number; accent: string }
  > = {
    draft: {
      label: 'Draft',
      short: 'Not yet approved',
      count: draftFiltered.length,
      accent: 'border-l-amber-500 bg-amber-50/90 text-amber-950',
    },
    approved: {
      label: 'Approved',
      short: 'Click a quote to edit, or use Convert to job',
      count: approvedFiltered.length,
      accent: 'border-l-emerald-500 bg-emerald-50/90 text-emerald-950',
    },
    cancelled: {
      label: 'Cancelled',
      short: 'Closed or not proceeding',
      count: cancelledFiltered.length,
      accent: 'border-l-rose-500 bg-rose-50/90 text-rose-950',
    },
  }
  const viewing = tabMeta[pipelineTab]

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-5'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by quote #, title, customer…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search quotes"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto font-semibold shadow-sm shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New quote
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm() }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New quote</DialogTitle>
            <DialogDescription>
              Creates a draft in the quote pipeline. Leave quote number blank to auto-assign the next Q number.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="nq-title">Title</Label>
              <Input
                id="nq-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Line upgrade — Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nq-num">Quote number (optional)</Label>
              <Input
                id="nq-num"
                value={newQuoteNumber}
                onChange={(e) => setNewQuoteNumber(e.target.value)}
                placeholder="Auto (Q0001, …)"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={newCustomerId || '__none__'} onValueChange={(v) => setNewCustomerId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nq-amt">Amount (optional)</Label>
              <Input
                id="nq-amt"
                type="number"
                min={0}
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nq-until">Valid until (optional)</Label>
              <Input
                id="nq-until"
                type="date"
                value={newValidUntil}
                onChange={(e) => setNewValidUntil(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nq-desc">Description (optional)</Label>
              <Textarea
                id="nq-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                placeholder="Scope, notes…"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm() }}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateQuote()} disabled={createSubmitting}>
              {createSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs
        value={pipelineTab}
        onValueChange={(v) => setPipelineTab(v as 'draft' | 'approved' | 'cancelled')}
        className="w-full"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 p-1.5 shadow-inner">
          <TabsTrigger
            value="draft"
            className={cn(
              'group gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium transition-all',
              'text-slate-600 hover:bg-white/70 hover:text-slate-900',
              'data-[state=active]:border-amber-200 data-[state=active]:bg-white data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-amber-400/40'
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Draft</span>
            <Badge
              variant="secondary"
              className="ml-0.5 min-w-[2rem] justify-center tabular-nums bg-slate-200/80 text-slate-800 group-data-[state=active]:bg-amber-100 group-data-[state=active]:text-amber-900"
            >
              {draftFiltered.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className={cn(
              'group gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium transition-all',
              'text-slate-600 hover:bg-white/70 hover:text-slate-900',
              'data-[state=active]:border-emerald-200 data-[state=active]:bg-white data-[state=active]:text-emerald-950 data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-emerald-400/40'
            )}
          >
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="whitespace-nowrap">Approved</span>
            <Badge
              variant="secondary"
              className="ml-0.5 min-w-[2rem] justify-center tabular-nums bg-slate-200/80 text-slate-800 group-data-[state=active]:bg-emerald-100 group-data-[state=active]:text-emerald-900"
            >
              {approvedFiltered.length}
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
            <span className="whitespace-nowrap">Cancelled</span>
            <Badge
              variant="secondary"
              className="ml-0.5 min-w-[2rem] justify-center tabular-nums bg-slate-200/80 text-slate-800 group-data-[state=active]:bg-rose-100 group-data-[state=active]:text-rose-900"
            >
              {cancelledFiltered.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <Card className="mt-3 overflow-hidden border border-slate-200 shadow-md">
          <CardHeader className={cn('border-b py-3 px-4 border-l-4', viewing.accent)}>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Current filter</p>
                <p className="text-base font-semibold text-slate-900">
                  {viewing.label}
                  <span className="text-slate-500 font-normal"> — {viewing.count} quote{viewing.count === 1 ? '' : 's'}</span>
                </p>
                <p className="text-sm text-slate-600">{viewing.short}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <TabsContent value="draft" className="mt-0 focus-visible:outline-none">
              {renderQuoteList(draftFiltered, 'draft')}
            </TabsContent>
            <TabsContent value="approved" className="mt-0 focus-visible:outline-none">
              {renderQuoteList(approvedFiltered, 'approved')}
            </TabsContent>
            <TabsContent value="cancelled" className="mt-0 focus-visible:outline-none">
              {renderQuoteList(cancelledFiltered, 'cancelled')}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}

