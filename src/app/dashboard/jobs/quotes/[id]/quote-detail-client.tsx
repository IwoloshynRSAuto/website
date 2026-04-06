'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, isValid } from 'date-fns'
import { ArrowLeft, Briefcase, Building2, Calendar, DollarSign, FileText, Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useToast } from '@/components/ui/use-toast'

interface LaborEstimate {
  id: string
  discipline: string
  estimatedHours: number
}

interface Revision {
  id: string
  revisionNumber: number
  notes: string | null
  createdAt: string
  createdBy?: { id: string; name: string | null; email: string | null } | null
  laborEstimates: LaborEstimate[]
}

function toInputDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isValid(d) ? format(d, 'yyyy-MM-dd') : ''
}

function formatDisplayDate(iso: string | null | undefined, pattern: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isValid(d) ? format(d, pattern) : '—'
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description: string | null
  status: string
  amount: number
  validUntil: string | null
  createdAt: string
  updatedAt: string
  paymentTerms: string | null
  estimatedHours: number | null
  hourlyRate: number | null
  customer: { id: string; name: string; email: string | null; phone: string | null } | null
  convertedJob: { id: string; jobNumber: string; title: string } | null
  revisions: Revision[]
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-700',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

interface Props {
  quote: Quote
}

type CustomerOption = { id: string; name: string }

export function QuoteDetailClient({ quote }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])

  const [title, setTitle] = useState(quote.title)
  const [description, setDescription] = useState(quote.description || '')
  const [amount, setAmount] = useState(String(quote.amount ?? 0))
  const [customerId, setCustomerId] = useState<string>(quote.customer?.id || '')
  const [validUntil, setValidUntil] = useState(() => toInputDate(quote.validUntil))
  const [paymentTerms, setPaymentTerms] = useState(quote.paymentTerms || '')
  const [estimatedHours, setEstimatedHours] = useState(
    quote.estimatedHours != null ? String(quote.estimatedHours) : ''
  )
  const [hourlyRate, setHourlyRate] = useState(quote.hourlyRate != null ? String(quote.hourlyRate) : '')

  useEffect(() => {
    setTitle(quote.title)
    setDescription(quote.description || '')
    setAmount(String(quote.amount ?? 0))
    setCustomerId(quote.customer?.id || '')
    setValidUntil(toInputDate(quote.validUntil))
    setPaymentTerms(quote.paymentTerms || '')
    setEstimatedHours(quote.estimatedHours != null ? String(quote.estimatedHours) : '')
    setHourlyRate(quote.hourlyRate != null ? String(quote.hourlyRate) : '')
  }, [
    quote.id,
    quote.updatedAt,
    quote.title,
    quote.description,
    quote.amount,
    quote.customer?.id,
    quote.validUntil,
    quote.paymentTerms,
    quote.estimatedHours,
    quote.hourlyRate,
  ])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/customers')
        if (!res.ok) return
        const result = await res.json()
        const data = result.data || (Array.isArray(result) ? result : [])
        setCustomers(
          Array.isArray(data) ? data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []
        )
      } catch {
        setCustomers([])
      }
    })()
  }, [])

  const customerOptions = useMemo(() => {
    const list = [...customers]
    if (quote.customer?.id && !list.some((c) => c.id === quote.customer!.id)) {
      list.push({
        id: quote.customer.id,
        name: quote.customer.name?.trim() || 'Customer',
      })
    }
    return list
  }, [customers, quote.customer])

  const customerSelectValue = useMemo(() => {
    if (!customerId) return '__none__'
    return customerOptions.some((c) => c.id === customerId) ? customerId : '__none__'
  }, [customerId, customerOptions])

  async function handleStatusChange(newStatus: 'APPROVED' | 'CANCELLED') {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Failed to update status')
      }
      toast({ title: `Quote ${newStatus.toLowerCase()}` })
      router.refresh()
    } catch (e) {
      toast({
        title: 'Error updating status',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    const t = title.trim()
    if (!t) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const amountNum = parseFloat(amount)
      const body: Record<string, unknown> = {
        title: t,
        description: description.trim() || null,
        amount: Number.isFinite(amountNum) ? Math.max(0, amountNum) : 0,
        customerId: customerId && customerId !== '__none__' ? customerId : null,
        validUntil: validUntil.trim() || null,
        paymentTerms: paymentTerms.trim() || null,
      }

      const eh = estimatedHours.trim()
      if (eh === '') body.estimatedHours = null
      else {
        const n = parseFloat(eh)
        body.estimatedHours = Number.isFinite(n) ? n : null
      }

      const hr = hourlyRate.trim()
      if (hr === '') body.hourlyRate = null
      else {
        const n = parseFloat(hr)
        body.hourlyRate = Number.isFinite(n) ? n : null
      }

      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Failed to save')
      }
      toast({ title: 'Quote saved' })
      router.refresh()
    } catch (e) {
      toast({
        title: 'Could not save',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleConvertToJob() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convertToJob`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to convert')
      const data = await res.json()
      toast({ title: 'Quote converted to job' })
      router.push(`/dashboard/jobs/${data.data?.id || ''}`)
    } catch {
      toast({ title: 'Error converting quote', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/jobs/quotes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quotes
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Edit quote</h1>
            <Badge className={STATUS_COLORS[quote.status] ?? 'bg-gray-100 text-gray-700'}>{quote.status}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1 tabular-nums">{quote.quoteNumber}</p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
          {quote.status === 'DRAFT' && (
            <>
              <Button size="sm" onClick={() => handleStatusChange('APPROVED')} disabled={loading || saving}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('CANCELLED')} disabled={loading || saving}>
                Cancel quote
              </Button>
            </>
          )}
          {(quote.status === 'APPROVED' || quote.status === 'WON') && !quote.convertedJob && (
            <Button size="sm" variant="secondary" onClick={() => void handleConvertToJob()} disabled={loading || saving}>
              <Briefcase className="h-4 w-4 mr-1" />
              Convert to Job
            </Button>
          )}
          {quote.convertedJob && (
            <Link href={`/dashboard/jobs/${quote.convertedJob.id}`}>
              <Button size="sm" variant="outline">
                View Job {quote.convertedJob.jobNumber}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quote details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qd-title">Title</Label>
            <Input id="qd-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qd-desc">Notes</Label>
            <Textarea
              id="qd-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Internal notes, scope reminders, follow-ups…"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qd-amt">Amount</Label>
              <Input
                id="qd-amt"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={customerSelectValue}
                onValueChange={(v) => setCustomerId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {customerOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qd-until">Valid until</Label>
              <Input id="qd-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qd-terms">Payment terms</Label>
              <Input
                id="qd-terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qd-eh">Estimated hours</Label>
              <Input
                id="qd-eh"
                type="number"
                min={0}
                step="0.25"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qd-hr">Hourly rate</Label>
              <Input
                id="qd-hr"
                type="number"
                min={0}
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          {quote.customer && (
            <div className="flex gap-2">
              <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span>{quote.customer.name}</span>
            </div>
          )}
          <div className="flex gap-2">
            <DollarSign className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <span className="tabular-nums">
              ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-2">
            <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <span className="text-gray-500">
              Created {formatDisplayDate(quote.createdAt, 'MMM d, yyyy')}
            </span>
          </div>
        </CardContent>
      </Card>

      {quote.revisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Revisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quote.revisions.map((rev) => (
                <div key={rev.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">Rev {rev.revisionNumber}</span>
                    <span className="text-xs text-gray-500">
                      {formatDisplayDate(rev.createdAt, 'MMM d, yyyy')}
                      {rev.createdBy
                        ? ` by ${rev.createdBy.name?.trim() || rev.createdBy.email || 'Unknown'}`
                        : ''}
                    </span>
                  </div>
                  {rev.notes && <p className="text-sm text-gray-600">{rev.notes}</p>}
                  {rev.laborEstimates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rev.laborEstimates.map((est) => (
                        <span key={est.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {est.discipline}: {est.estimatedHours}h
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
