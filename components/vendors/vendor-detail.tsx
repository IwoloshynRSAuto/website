'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Building2, Mail, Phone, Globe, MapPin, Package, DollarSign, TrendingUp, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { VendorMetrics } from './vendor-metrics'
import { VendorPartPrices } from './vendor-part-prices'
import { VendorPurchaseOrders } from './vendor-purchase-orders'

interface Vendor {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  category: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  purchaseOrderCount: number
  partPriceCount: number
}

interface PurchaseOrder {
  id: string
  poNumber: string
  status: string
  orderDate: string
  expectedDate: string | null
  receivedDate: string | null
  totalAmount: number
  jobNumber: string | null
  jobTitle: string | null
  itemCount: number
}

interface PartPrice {
  id: string
  partId: string
  partNumber: string
  manufacturer: string
  description: string | null
  price: number
  leadTimeDays: number | null
  minimumOrderQuantity: number | null
  effectiveDate: string
  notes: string | null
}

interface VendorDetailProps {
  vendor: Vendor
  initialPurchaseOrders: PurchaseOrder[]
  initialPartPrices: PartPrice[]
}

export function VendorDetail({ vendor, initialPurchaseOrders, initialPartPrices }: VendorDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<any>(null)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      setIsLoadingMetrics(true)
      const year = new Date().getFullYear()
      const response = await fetch(`/api/vendors/${vendor.id}/metrics?year=${year}`)
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data.data)
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setIsLoadingMetrics(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'DRAFT': 'outline',
      'SENT': 'secondary',
      'RECEIVED': 'default',
      'PARTIALLY_RECEIVED': 'secondary',
      'COMPLETED': 'default',
      'CANCELLED': 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/vendors')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Vendors
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{vendor.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              {vendor.category && (
                <Badge variant="outline">{vendor.category}</Badge>
              )}
              <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Vendor
          </Button>
        </div>
      </div>

      {/* Vendor Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <div className="text-sm text-gray-600">Email</div>
            </div>
            <div className="font-medium">
              {vendor.email || <span className="text-gray-400">—</span>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-5 w-5 text-green-600" />
              <div className="text-sm text-gray-600">Phone</div>
            </div>
            <div className="font-medium">
              {vendor.phone || <span className="text-gray-400">—</span>}
            </div>
          </CardContent>
        </Card>
        {vendor.website && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-5 w-5 text-purple-600" />
                <div className="text-sm text-gray-600">Website</div>
              </div>
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                Visit Website
              </a>
            </CardContent>
          </Card>
        )}
        {vendor.address && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-red-600" />
                <div className="text-sm text-gray-600">Address</div>
              </div>
              <div className="font-medium text-sm">{vendor.address}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contact Info */}
      {vendor.contactName && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div className="font-medium">{vendor.contactName}</div>
              {vendor.email && <div className="text-gray-600">{vendor.email}</div>}
              {vendor.phone && <div className="text-gray-600">{vendor.phone}</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {vendor.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{vendor.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="purchase-orders">
            Purchase Orders ({initialPurchaseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="part-prices">
            Part Prices ({initialPartPrices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <VendorMetrics vendorId={vendor.id} initialMetrics={metrics} isLoading={isLoadingMetrics} />
        </TabsContent>

        <TabsContent value="purchase-orders">
          <VendorPurchaseOrders vendorId={vendor.id} initialOrders={initialPurchaseOrders} />
        </TabsContent>

        <TabsContent value="part-prices">
          <VendorPartPrices vendorId={vendor.id} initialPrices={initialPartPrices} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

