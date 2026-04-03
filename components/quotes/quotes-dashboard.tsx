'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, FileText, Search, Calendar, TrendingUp, DollarSign, Clock } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface Quote {
  id: string
  quoteNumber: string
  title: string
  customerName: string | null
  customerId: string | null
  bomId: string | null
  bomName: string | null
  status: string
  amount: number
  totalCost: number
  totalCustomerPrice: number
  validUntil: string | null
  lastFollowUp: string | null
  createdAt: string
  updatedAt: string
  fileCount: number
}

interface AgingQuote {
  id: string
  quoteNumber: string
  title: string
  customerName: string | null
  status: string
  daysSinceUpdate: number
  isExpired: boolean
  agingAlert: string
  validUntil: string | null
  updatedAt: string
}

interface QuotesDashboardProps {
  initialQuotes: Quote[]
  initialAgingQuotes: AgingQuote[]
}

export function QuotesDashboard({ initialQuotes, initialAgingQuotes }: QuotesDashboardProps) {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const [agingQuotes, setAgingQuotes] = useState<AgingQuote[]>(initialAgingQuotes)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadQuotes()
    loadAgingQuotes()
  }, [searchTerm, statusFilter])

  const loadQuotes = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/quotes?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load quotes')
      const data = await response.json()
      setQuotes(data.data || [])
    } catch (error) {
      console.error('Error loading quotes:', error)
    }
  }

  const loadAgingQuotes = async () => {
    try {
      const response = await fetch('/api/quotes/aging?days=30')
      if (!response.ok) throw new Error('Failed to load aging quotes')
      const data = await response.json()
      setAgingQuotes(data.data || [])
    } catch (error) {
      console.error('Error loading aging quotes:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'DRAFT': 'outline',
      'SENT': 'secondary',
      'WON': 'default',
      'LOST': 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const getAgingBadge = (alert: string) => {
    if (alert === 'EXPIRED') {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Expired
      </Badge>
    }
    if (alert === 'AGING') {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Aging
      </Badge>
    }
    return null
  }

  const filteredQuotes = quotes.filter(quote => {
    if (statusFilter !== 'all' && quote.status !== statusFilter) return false
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      quote.quoteNumber.toLowerCase().includes(search) ||
      quote.title.toLowerCase().includes(search) ||
      (quote.customerName?.toLowerCase().includes(search) || false)
    )
  })

  // Calculate stats
  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'DRAFT').length,
    sent: quotes.filter(q => q.status === 'SENT').length,
    won: quotes.filter(q => q.status === 'WON').length,
    lost: quotes.filter(q => q.status === 'LOST').length,
    expired: agingQuotes.filter(q => q.isExpired).length,
    aging: agingQuotes.filter(q => q.agingAlert === 'AGING').length,
  }

  const totalValue = quotes.reduce((sum, q) => sum + (q.amount || q.totalCustomerPrice), 0)
  const wonValue = quotes.filter(q => q.status === 'WON').reduce((sum, q) => sum + (q.amount || q.totalCustomerPrice), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quotes Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Manage quotes, track aging, and monitor win/loss rates
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Quotes</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Draft</div>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Sent</div>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Won</div>
            <div className="text-2xl font-bold text-green-600">{stats.won}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Lost</div>
            <div className="text-2xl font-bold text-red-600">{stats.lost}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Expired</div>
            <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Aging</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.aging}</div>
          </CardContent>
        </Card>
      </div>

      {/* Value Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Quote Value</div>
                <div className="text-3xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Won Value</div>
                <div className="text-3xl font-bold text-green-600">${wonValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.total > 0 ? ((wonValue / totalValue) * 100).toFixed(1) : 0}% of total
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Quotes</TabsTrigger>
            <TabsTrigger value="aging">Aging Alerts ({stats.expired + stats.aging})</TabsTrigger>
            <TabsTrigger value="draft">Draft ({stats.draft})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({stats.sent})</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[200px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="WON">Won</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="all">
          <QuotesTable quotes={filteredQuotes} getStatusBadge={getStatusBadge} />
        </TabsContent>

        <TabsContent value="aging">
          <AgingQuotesTable quotes={agingQuotes} getAgingBadge={getAgingBadge} getStatusBadge={getStatusBadge} />
        </TabsContent>

        <TabsContent value="draft">
          <QuotesTable quotes={filteredQuotes.filter(q => q.status === 'DRAFT')} getStatusBadge={getStatusBadge} />
        </TabsContent>

        <TabsContent value="sent">
          <QuotesTable quotes={filteredQuotes.filter(q => q.status === 'SENT')} getStatusBadge={getStatusBadge} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function QuotesTable({ quotes, getStatusBadge }: { quotes: Quote[]; getStatusBadge: (status: string) => JSX.Element }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No quotes found
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/jobs/quotes/${quote.id}`} className="text-blue-600 hover:underline">
                        {quote.quoteNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{quote.title}</TableCell>
                    <TableCell>
                      {quote.customerName ? (
                        quote.customerId ? (
                          <Link href={`/dashboard/customers/${quote.customerId}`} className="text-blue-600 hover:underline">
                            {quote.customerName}
                          </Link>
                        ) : (
                          quote.customerName
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(quote.amount || quote.totalCustomerPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {quote.validUntil ? (
                        format(new Date(quote.validUntil), 'MMM d, yyyy')
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(quote.updatedAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/jobs/quotes/${quote.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function AgingQuotesTable({ quotes, getAgingBadge, getStatusBadge }: { quotes: AgingQuote[]; getAgingBadge: (alert: string) => JSX.Element | null; getStatusBadge: (status: string) => JSX.Element }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alert</TableHead>
                <TableHead>Days Since Update</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No aging quotes found
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote.id} className={quote.isExpired ? 'bg-red-50' : 'bg-yellow-50'}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/jobs/quotes/${quote.id}`} className="text-blue-600 hover:underline">
                        {quote.quoteNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{quote.title}</TableCell>
                    <TableCell>{quote.customerName || <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell>{getAgingBadge(quote.agingAlert)}</TableCell>
                    <TableCell>{quote.daysSinceUpdate} days</TableCell>
                    <TableCell>
                      {quote.validUntil ? (
                        format(new Date(quote.validUntil), 'MMM d, yyyy')
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/jobs/quotes/${quote.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

