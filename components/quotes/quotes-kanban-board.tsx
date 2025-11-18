'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  FileText,
  DollarSign,
  ArrowRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  Wrench,
  Building2,
  Calendar,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description: string | null
  customerId: string | null
  customerName: string | null
  amount: number
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED'
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
}

export function QuotesKanbanBoard({ initialQuotes }: QuotesKanbanBoardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const [loadingQuotes, setLoadingQuotes] = useState<Set<string>>(new Set())
  const [convertingQuotes, setConvertingQuotes] = useState<Set<string>>(new Set())

  // Group quotes by status
  const draftQuotes = quotes.filter(q => q.status === 'DRAFT')
  const approvedQuotes = quotes.filter(q => q.status === 'APPROVED')
  const cancelledQuotes = quotes.filter(q => q.status === 'CANCELLED')

  const loadQuotes = async () => {
    try {
      const response = await fetch('/api/quotes')
      if (!response.ok) throw new Error('Failed to load quotes')
      const data = await response.json()
      if (data.success) {
        setQuotes(data.data || [])
      }
    } catch (error) {
      console.error('[QuotesKanbanBoard] Error loading quotes:', error)
      toast({
        title: 'Error',
        description: 'Failed to load quotes',
        variant: 'destructive',
      })
    }
  }

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

  const convertToJob = async (quoteId: string) => {
    if (convertingQuotes.has(quoteId)) return

    if (!confirm('Convert this approved quote to a job? This will create a new job record.')) {
      return
    }

    setConvertingQuotes(prev => new Set(prev).add(quoteId))

    try {
      console.log('[QuotesKanbanBoard] Converting quote to job:', quoteId)

      const response = await fetch(`/api/quotes/${quoteId}/convertToJob`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('[QuotesKanbanBoard] Conversion failed:', data)
        throw new Error(data.error || 'Failed to convert quote to job')
      }

      console.log('[QuotesKanbanBoard] Conversion successful:', data)

      toast({
        title: 'Success',
        description: `Quote converted to job ${data.data.jobNumber} successfully`,
      })

      // Refresh to get updated quote with job link
      await loadQuotes()

      // Navigate to the new job
      if (data.data?.id) {
        router.push(`/dashboard/jobs/${data.data.id}`)
      }
    } catch (error: any) {
      console.error('[QuotesKanbanBoard] Error converting quote:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to convert quote to job',
        variant: 'destructive',
      })
    } finally {
      setConvertingQuotes(prev => {
        const next = new Set(prev)
        next.delete(quoteId)
        return next
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const QuoteCard = ({ quote }: { quote: Quote }) => {
    const isLoading = loadingQuotes.has(quote.id)
    const isConverting = convertingQuotes.has(quote.id)

    return (
      <Card className="mb-4 border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Link href={`/dashboard/parts/quotes/${quote.id}`}>
                  <div className="font-bold text-lg text-gray-900 hover:text-blue-600 transition-colors">
                    {quote.quoteNumber}
                  </div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">
                    {quote.title}
                  </div>
                </Link>
              </div>
              <Badge className={getStatusColor(quote.status)}>
                {quote.status}
              </Badge>
            </div>

            {/* Customer */}
            {quote.customerName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4" />
                <span>{quote.customerName}</span>
              </div>
            )}

            {/* Amount */}
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="font-bold text-lg text-gray-900">
                ${quote.amount.toFixed(2)}
              </span>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>Created: {format(new Date(quote.createdAt), 'MMM d, yyyy')}</span>
            </div>

            {/* Job Link */}
            {quote.job && (
              <div className="pt-2 border-t border-gray-200">
                <Link
                  href={`/dashboard/jobs/${quote.job.id}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Wrench className="h-4 w-4" />
                  <span>Job: {quote.job.jobNumber}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-gray-200 space-y-2">
              {quote.status === 'DRAFT' && (
                <>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuoteStatus(quote.id, 'APPROVED')
                    }}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Move to Approved
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuoteStatus(quote.id, 'CANCELLED')
                    }}
                    disabled={isLoading}
                    variant="destructive"
                    className="w-full font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Move to Cancelled
                  </Button>
                </>
              )}

              {quote.status === 'APPROVED' && (
                <>
                  {!quote.job ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        convertToJob(quote.id)
                      }}
                      disabled={isConverting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px]"
                    >
                      {isConverting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wrench className="h-4 w-4 mr-2" />
                      )}
                      Convert to Job
                    </Button>
                  ) : (
                    <div className="text-sm text-gray-600 text-center py-2">
                      Already converted to job
                    </div>
                  )}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuoteStatus(quote.id, 'CANCELLED')
                    }}
                    disabled={isLoading}
                    variant="destructive"
                    className="w-full font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Move to Cancelled
                  </Button>
                </>
              )}

              {quote.status === 'CANCELLED' && (
                <>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuoteStatus(quote.id, 'DRAFT')
                    }}
                    disabled={isLoading}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Move to Draft
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuoteStatus(quote.id, 'APPROVED')
                    }}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Move to Approved
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Draft Column */}
        <div className="space-y-4">
          <Card className="border-2 border-gray-300 bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span>Draft</span>
                </div>
                <Badge variant="outline" className="bg-white">
                  {draftQuotes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {draftQuotes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No draft quotes</p>
                </div>
              ) : (
                draftQuotes.map(quote => (
                  <QuoteCard key={quote.id} quote={quote} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Approved Column */}
        <div className="space-y-4">
          <Card className="border-2 border-green-300 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Approved</span>
                </div>
                <Badge variant="outline" className="bg-white border-green-300 text-green-800">
                  {approvedQuotes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {approvedQuotes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No approved quotes</p>
                </div>
              ) : (
                approvedQuotes.map(quote => (
                  <QuoteCard key={quote.id} quote={quote} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cancelled Column */}
        <div className="space-y-4">
          <Card className="border-2 border-red-300 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>Cancelled</span>
                </div>
                <Badge variant="outline" className="bg-white border-red-300 text-red-800">
                  {cancelledQuotes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {cancelledQuotes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <XCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No cancelled quotes</p>
                </div>
              ) : (
                cancelledQuotes.map(quote => (
                  <QuoteCard key={quote.id} quote={quote} />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

