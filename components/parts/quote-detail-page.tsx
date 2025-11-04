'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Link as LinkIcon, Unlink, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { BOMPartsTable } from '@/components/parts/bom-parts-table'

interface BOMPart {
  id: string
  bomId: string
  partId: string | null
  purchasePrice: number
  markupPercent: number
  customerPrice: number
  quantity: number
  partNumber: string
  manufacturer: string
  description: string | null
  source: string | null
  estimatedDelivery: string | null
  status: 'HOLD' | 'ORDER' | 'PLACED' | 'HERE' | 'STOCK' | 'CUSTOMER_SUPPLIED'
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description: string | null
  amount: number
  status: string
  customerId: string | null
  bomId: string | null
  bom: {
    id: string
    name: string
    parts: BOMPart[]
  } | null
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
  } | null
  createdAt: string
  updatedAt: string
}

interface BOMPartForTable {
  id: string
  bomId: string
  partId: string | null
  partNumber: string
  quantity: number
  purchasePrice: number
  markupPercent: number
  customerPrice: number
  manufacturer: string
  description: string | null
  source: string | null
  estimatedDelivery: string | null
  status: 'HOLD' | 'ORDER' | 'PLACED' | 'HERE' | 'STOCK' | 'CUSTOMER_SUPPLIED'
}

interface QuoteDetailPageProps {
  quote: Quote
}

export function QuoteDetailPage({ quote: initialQuote }: QuoteDetailPageProps) {
  const router = useRouter()
  const [quote, setQuote] = useState<Quote>(initialQuote)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handlePartUpdated = () => {
    // Refresh quote data to get updated BOM
    setIsRefreshing(true)
    fetch(`/api/quotes/${quote.id}`)
      .then(res => res.json())
      .then(data => {
        const linkedBOM = data.linkedBOMs && data.linkedBOMs.length > 0 ? data.linkedBOMs[0] : null
        setQuote(prevQuote => ({
          ...prevQuote,
          bom: linkedBOM ? {
            id: linkedBOM.id,
            name: linkedBOM.name,
            parts: linkedBOM.parts.map((part: any) => ({
              id: part.id,
              bomId: linkedBOM.id,
              partId: part.partId,
              purchasePrice: Number(part.purchasePrice),
              markupPercent: Number(part.markupPercent),
              customerPrice: Number(part.customerPrice),
              quantity: part.quantity,
              partNumber: part.partNumber,
              manufacturer: part.manufacturer,
              description: part.description,
              source: part.source,
              estimatedDelivery: part.estimatedDelivery ? new Date(part.estimatedDelivery).toISOString() : null,
              status: part.status,
            })),
          } : null,
          bomId: linkedBOM?.id || null,
        }))
        router.refresh()
      })
      .catch(err => {
        console.error('Error refreshing quote:', err)
        toast.error('Failed to refresh quote data')
      })
      .finally(() => setIsRefreshing(false))
  }

  const handleUnlinkBOM = async () => {
    if (!confirm('Are you sure you want to unlink this BOM from the quote? The BOM will not be deleted, only disconnected.')) {
      return
    }

    try {
      setIsRefreshing(true)
      const response = await fetch(`/api/quotes/${quote.id}/unlink-bom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bomId: quote.bom?.id }),
      })

      if (response.ok) {
        toast.success('BOM unlinked from quote')
        setQuote(prevQuote => ({
          ...prevQuote,
          bom: null,
          bomId: null,
        }))
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to unlink BOM')
      }
    } catch (error) {
      console.error('Error unlinking BOM:', error)
      toast.error('An error occurred while unlinking the BOM')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete quote ${quote.quoteNumber}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Quote deleted successfully')
        router.push('/dashboard/parts/quotes')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete quote')
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast.error('An error occurred while deleting the quote')
    }
  }

  const totalCost = quote.bom?.parts.reduce((sum, part) => 
    sum + (part.purchasePrice * part.quantity), 0
  ) || 0
  const totalCustomerPrice = quote.bom?.parts.reduce((sum, part) => 
    sum + part.customerPrice, 0
  ) || 0

  // Map BOM parts to table format
  const bomPartsForTable: BOMPartForTable[] = quote.bom?.parts.map(part => ({
    id: part.id,
    bomId: quote.bom!.id,
    partId: null,
    partNumber: part.partNumber,
    quantity: part.quantity,
    purchasePrice: part.purchasePrice,
    markupPercent: part.markupPercent,
    customerPrice: part.customerPrice,
    manufacturer: part.manufacturer,
    description: part.description,
    source: part.source || null,
    estimatedDelivery: part.estimatedDelivery || null,
    status: part.status,
  })) || []

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
    <div>
      <DashboardPageContainer>
        <DashboardHeader
          title={quote.title}
          subtitle={`Quote ${quote.quoteNumber} • Created ${format(new Date(quote.createdAt), 'MMM d, yyyy')}`}
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/parts/quotes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {quote.bomId && (
              <Button variant="outline" asChild>
                <Link href={`/dashboard/parts/assemblies/${quote.bomId}`}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  View BOM
                </Link>
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </DashboardHeader>

        <DashboardContent>
          {/* Quote Information - Compact Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Quote Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Quote Number</p>
                      <p className="font-medium text-gray-900">{quote.quoteNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <div className="mt-1">
                        {getStatusBadge(quote.status)}
                      </div>
                    </div>
                  </div>
                  {quote.customer && (
                    <div>
                      <p className="text-sm text-gray-600">Customer</p>
                      <Link
                        href={`/dashboard/customers/${quote.customer.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {quote.customer.name}
                      </Link>
                    </div>
                  )}
                  {quote.description && (
                    <div>
                      <p className="text-sm text-gray-600">Description</p>
                      <p className="text-gray-900">{quote.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary - Compact */}
            {quote.bom && (
              <Card className="border-2 border-purple-100 shadow-md">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-purple-200">
                  <CardTitle className="text-purple-900 font-bold text-sm">BOM Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Parts</p>
                    <p className="text-2xl font-bold text-gray-900">{quote.bom.parts.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs uppercase tracking-wide text-green-600 mb-1">Total</p>
                    <p className="text-2xl font-bold text-green-700">${totalCustomerPrice.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DashboardContent>
      </DashboardPageContainer>

      {/* BOM SECTION REMOVED FOR TESTING */}
    </div>
  )
}

