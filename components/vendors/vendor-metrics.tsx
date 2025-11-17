'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, Package, TrendingUp, ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'

interface VendorMetricsProps {
  vendorId: string
  initialMetrics: any
  isLoading: boolean
}

export function VendorMetrics({ vendorId, initialMetrics, isLoading }: VendorMetricsProps) {
  const [metrics, setMetrics] = useState(initialMetrics)
  const [year, setYear] = useState(new Date().getFullYear())
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(isLoading)

  useEffect(() => {
    loadMetrics()
  }, [year])

  const loadMetrics = async () => {
    try {
      setIsLoadingMetrics(true)
      const response = await fetch(`/api/vendors/${vendorId}/metrics?year=${year}`)
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data.data)
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setIsLoadingMetrics(false)
    }
  }

  if (isLoadingMetrics) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading metrics...
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-gray-500">
        No metrics available
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Annual Metrics</h3>
        <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Spend</div>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold">
              ${metrics.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Year {year}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Orders</div>
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{metrics.totalOrders || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Purchase orders</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Parts Ordered</div>
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold">{metrics.totalPartsOrdered || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Total quantity</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Avg Order Value</div>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">
              ${metrics.averageOrderValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Per order</div>
          </CardContent>
        </Card>
      </div>

      {metrics.uniqueParts !== undefined && (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600 mb-1">Unique Parts</div>
            <div className="text-xl font-semibold">{metrics.uniqueParts || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Different parts ordered this year</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

