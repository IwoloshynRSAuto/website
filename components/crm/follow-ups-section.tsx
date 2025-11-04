'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, FileText, Briefcase, Calendar, Building2, ArrowRight } from 'lucide-react'
import { format, isAfter, subDays, differenceInDays } from 'date-fns'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface FollowUpQuote {
  id: string
  quoteNumber: string
  title: string
  status: string
  isActive: boolean
  lastFollowUp: string | null
  customer: {
    id: string
    name: string
  } | null
}

interface FollowUpJob {
  id: string
  jobNumber: string
  title: string
  status: string
  lastFollowUp: string | null
  customer: {
    id: string
    name: string
  } | null
}

export function FollowUpsSection() {
  const router = useRouter()
  const [followUps, setFollowUps] = useState<{
    quotes: FollowUpQuote[]
    jobs: FollowUpJob[]
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFollowUps()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFollowUps = async () => {
    try {
      const response = await fetch('/api/follow-ups')
      if (response.ok) {
        const data = await response.json()
        setFollowUps(data)
      } else {
        console.error('Failed to fetch follow-ups:', response.status, response.statusText)
        setFollowUps({ quotes: [], jobs: [], total: 0 })
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
      // Set empty state to prevent crashes
      setFollowUps({ quotes: [], jobs: [], total: 0 })
    } finally {
      setLoading(false)
    }
  }

      const isOverdue = (lastFollowUp: string | null) => {
        if (!lastFollowUp) return true
        const sevenDaysAgo = subDays(new Date(), 7)
        return isAfter(sevenDaysAgo, new Date(lastFollowUp))
      }

      const daysSinceFollowUp = (lastFollowUp: string | null) => {
        if (!lastFollowUp) return null
        return differenceInDays(new Date(), new Date(lastFollowUp))
      }

  const markFollowUp = async (type: 'quote' | 'job', id: string) => {
    try {
      const response = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })

      if (response.ok) {
        toast.success('Follow-up marked as completed')
        fetchFollowUps()
      } else {
        toast.error('Failed to mark follow-up')
      }
    } catch (error) {
      console.error('Error marking follow-up:', error)
      toast.error('An error occurred')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Follow-ups Needed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!followUps || followUps.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Follow-ups
          </CardTitle>
          <CardDescription>All follow-ups are up to date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No overdue follow-ups! Great job keeping in touch with customers.
          </div>
        </CardContent>
      </Card>
    )
  }

  const overdueCount = followUps ? [
    ...followUps.quotes.filter(q => isOverdue(q.lastFollowUp)),
    ...followUps.jobs.filter(j => isOverdue(j.lastFollowUp))
  ].length : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Follow-ups Needed
            </CardTitle>
            <CardDescription>
              {followUps?.total || 0} item{(followUps?.total || 0) !== 1 ? 's' : ''} requiring follow-up
              {overdueCount > 0 && (
                <span className="text-orange-600 font-semibold ml-2">
                  ({overdueCount} overdue)
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant={overdueCount > 0 ? 'destructive' : 'default'}>
            {overdueCount} Overdue
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quotes Needing Follow-up */}
        {followUps && followUps.quotes.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quotes ({followUps.quotes.length})
            </h4>
            <div className="space-y-2">
              {followUps?.quotes.slice(0, 5).map((quote) => {
                const overdue = isOverdue(quote.lastFollowUp)
                const days = daysSinceFollowUp(quote.lastFollowUp)
                
                return (
                  <div
                    key={quote.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={quote.customer?.id ? `/dashboard/customers/${quote.customer.id}` : '/dashboard/customers'}
                            className="font-medium text-blue-600 hover:underline truncate"
                          >
                            {quote.quoteNumber} - {quote.title}
                          </Link>
                          {overdue && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          <span>{quote.customer?.name || 'No customer'}</span>
                          {days !== null && (
                            <span className="text-gray-500">
                              • {days} day{days !== 1 ? 's' : ''} since last follow-up
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => markFollowUp('quote', quote.id)}
                        variant={overdue ? 'default' : 'outline'}
                        className="flex-shrink-0"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Mark Done
                      </Button>
                    </div>
                  </div>
                )
              })}
              {followUps && followUps.quotes.length > 5 && (
                <div className="text-center pt-2">
                  <Link
                    href="/dashboard/customers"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View all {followUps.quotes.length} quotes needing follow-up →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Jobs Needing Follow-up */}
        {followUps && followUps.jobs.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs ({followUps.jobs.length})
            </h4>
            <div className="space-y-2">
              {followUps?.jobs.slice(0, 5).map((job) => {
                const overdue = isOverdue(job.lastFollowUp)
                const days = daysSinceFollowUp(job.lastFollowUp)
                
                return (
                  <div
                    key={job.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={job.customer?.id ? `/dashboard/customers/${job.customer.id}` : '/dashboard/customers'}
                            className="font-medium text-blue-600 hover:underline truncate"
                          >
                            {job.jobNumber} - {job.title}
                          </Link>
                          {overdue && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          <span>{job.customer?.name || 'No customer'}</span>
                          {days !== null && (
                            <span className="text-gray-500">
                              • {days} day{days !== 1 ? 's' : ''} since last follow-up
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => markFollowUp('job', job.id)}
                        variant={overdue ? 'default' : 'outline'}
                        className="flex-shrink-0"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Mark Done
                      </Button>
                    </div>
                  </div>
                )
              })}
              {followUps && followUps.jobs.length > 5 && (
                <div className="text-center pt-2">
                  <Link
                    href="/dashboard/customers"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View all {followUps.jobs.length} jobs needing follow-up →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <Link href="/dashboard/customers">
            <Button variant="outline" className="w-full">
              View All Customers
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

