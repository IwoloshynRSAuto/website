'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileText, DollarSign, Link as LinkIcon } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface QuoteData {
  id: string
  quoteNumber: string
  title: string
  customerName: string | null
  bomId: string | null
  bomName: string | null
  status: string
  totalCost: number
  totalCustomerPrice: number
  createdAt: string
  updatedAt: string
}

interface QuotesListViewProps {
  initialQuotes: QuoteData[]
}

export function QuotesListView({ initialQuotes }: QuotesListViewProps) {
  const router = useRouter()
  const [quotes] = useState<QuoteData[]>(initialQuotes)

  const handleQuoteClick = (quoteId: string) => {
    router.push(`/dashboard/parts/quotes/${quoteId}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>
      case 'PENDING':
        return <Badge variant="outline" className="border-yellow-600 text-yellow-700">Pending</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="border-green-600 text-green-700">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="outline" className="border-red-600 text-red-700">Rejected</Badge>
      case 'COMPLETED':
        return <Badge variant="outline" className="border-blue-600 text-blue-700">Completed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="Quotes"
        subtitle="Customer quotes generated from BOMs"
      >
        {/* Quotes are created from BOMs, so no direct create button */}
      </DashboardHeader>

      <DashboardContent>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Linked BOM</TableHead>
                    <TableHead className="text-right">Customer Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No quotes found. Save a BOM as a Quote to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    quotes.map((quote) => (
                      <TableRow
                        key={quote.id}
                        className="cursor-pointer hover:bg-amber-50 transition-colors duration-150"
                        onClick={() => handleQuoteClick(quote.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            {quote.quoteNumber}
                          </div>
                        </TableCell>
                        <TableCell>{quote.title}</TableCell>
                        <TableCell>{quote.customerName || '-'}</TableCell>
                        <TableCell>
                          {quote.bomId && quote.bomName ? (
                            <Link
                              href={`/dashboard/parts/assemblies/${quote.bomId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <LinkIcon className="h-3 w-3" />
                              {quote.bomName}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${quote.totalCustomerPrice.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(quote.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

