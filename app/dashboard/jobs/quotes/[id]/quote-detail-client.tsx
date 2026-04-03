'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Briefcase, Building2, Calendar, DollarSign, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  createdBy: { id: string; name: string | null; email: string }
  laborEstimates: LaborEstimate[]
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description: string | null
  scope: string | null
  status: string
  amount: number
  validUntil: string | null
  createdAt: string
  updatedAt: string
  customer: { id: string; name: string; email: string | null; phone: string | null } | null
  convertedJob: { id: string; jobNumber: string; title: string } | null
  revisions: Revision[]
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  APPROVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

interface Props {
  quote: Quote
  userId: string
}

export function QuoteDetailClient({ quote, userId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleStatusChange(newStatus: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast({ title: `Quote ${newStatus.toLowerCase()}` })
      router.refresh()
    } catch {
      toast({ title: 'Error updating status', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleConvertToJob() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convertToJob`, {
        method: 'POST',
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
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/jobs/quotes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quotes
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
            <Badge className={STATUS_COLORS[quote.status] || 'bg-gray-100 text-gray-700'}>
              {quote.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{quote.quoteNumber}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          {quote.status === 'DRAFT' && (
            <>
              <Button
                size="sm"
                onClick={() => handleStatusChange('APPROVED')}
                disabled={loading}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('CANCELLED')}
                disabled={loading}
              >
                Cancel
              </Button>
            </>
          )}
          {quote.status === 'APPROVED' && !quote.convertedJob && (
            <Button size="sm" onClick={handleConvertToJob} disabled={loading}>
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

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {quote.customer && (
              <div className="flex gap-2">
                <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-gray-700">{quote.customer.name}</span>
              </div>
            )}
            {quote.amount > 0 && (
              <div className="flex gap-2">
                <DollarSign className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-gray-700">
                  ${quote.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {quote.validUntil && (
              <div className="flex gap-2">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-gray-700">
                  Valid until {format(new Date(quote.validUntil), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span className="text-gray-500">
                Created {format(new Date(quote.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>

        {(quote.description || quote.scope) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-2">
              {quote.description && <p>{quote.description}</p>}
              {quote.scope && (
                <div>
                  <p className="font-medium text-gray-900 mb-1">Scope</p>
                  <p className="whitespace-pre-wrap">{quote.scope}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Revisions */}
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
                      {format(new Date(rev.createdAt), 'MMM d, yyyy')} by {rev.createdBy.name || rev.createdBy.email}
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
