'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { BarChart3, DollarSign, Package, TrendingUp, TrendingDown } from 'lucide-react'
// Chart component - using simple HTML/CSS bar chart instead of recharts
// If recharts is needed, install: npm install recharts

interface VendorInsight {
  vendorId: string
  vendorName: string
  totalSpendThisYear: number
  totalSpendLastYear: number
  totalPartsOrdered: number
  vendorContact: {
    name: string | null
    email: string | null
    phone: string | null
    website: string | null
  }
  isSource?: boolean // Vendor is referenced as primarySource or secondarySource in parts
}

export function VendorInsightsPanel() {
  const [insights, setInsights] = useState<VendorInsight[]>([])
  const [totalSpend, setTotalSpend] = useState(0)
  const [year, setYear] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [year])

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/parts/vendor-insights?year=${year}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setInsights(data.data.vendors || [])
          setTotalSpend(data.data.totalSpend || 0)
        }
      }
    } catch (error) {
      console.error('Error fetching vendor insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Prepare chart data
  const chartData = insights.slice(0, 10).map((v) => ({
    name: v.vendorName.length > 15 ? v.vendorName.substring(0, 15) + '...' : v.vendorName,
    thisYear: v.totalSpendThisYear,
    lastYear: v.totalSpendLastYear,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vendor Insights</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track vendor spend, parts ordered, and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="year">Year</Label>
          <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value, 10))}>
            <SelectTrigger id="year" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Spend ({year})</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{insights.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Parts Ordered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insights.reduce((sum, v) => sum + v.totalPartsOrdered, 0).toLocaleString()}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart - Simple HTML/CSS bar chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Spend Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.map((item, idx) => {
                const maxValue = Math.max(
                  ...chartData.map(d => Math.max(d.thisYear, d.lastYear))
                )
                const thisYearPercent = (item.thisYear / maxValue) * 100
                const lastYearPercent = (item.lastYear / maxValue) * 100

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex gap-4">
                        <span className="text-blue-600">
                          ${item.thisYear.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-gray-500">
                          ${item.lastYear.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 h-6">
                      <div
                        className="bg-blue-600 rounded"
                        style={{ width: `${thisYearPercent}%` }}
                        title={`${year}: $${item.thisYear.toLocaleString()}`}
                      />
                      <div
                        className="bg-gray-400 rounded"
                        style={{ width: `${lastYearPercent}%` }}
                        title={`${year - 1}: $${item.lastYear.toLocaleString()}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded" />
                <span>{year} Spend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded" />
                <span>{year - 1} Spend</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : insights.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No vendor data found for {year}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Vendor</th>
                    <th className="text-center p-3 font-semibold">Source</th>
                    <th className="text-right p-3 font-semibold">Spend ({year})</th>
                    <th className="text-right p-3 font-semibold">Spend ({year - 1})</th>
                    <th className="text-right p-3 font-semibold">Change</th>
                    <th className="text-right p-3 font-semibold">Parts Ordered</th>
                    <th className="text-left p-3 font-semibold">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.map((vendor) => {
                    const change = vendor.totalSpendLastYear > 0
                      ? ((vendor.totalSpendThisYear - vendor.totalSpendLastYear) / vendor.totalSpendLastYear) * 100
                      : 0
                    const isIncrease = change > 0

                    return (
                      <tr key={vendor.vendorId} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{vendor.vendorName}</td>
                        <td className="p-3 text-center">
                          {vendor.isSource ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                              No
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          ${vendor.totalSpendThisYear.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right">
                          ${vendor.totalSpendLastYear.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right">
                          <div className={`flex items-center justify-end gap-1 ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                            {isIncrease ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span>{Math.abs(change).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">{vendor.totalPartsOrdered.toLocaleString()}</td>
                        <td className="p-3">
                          <div className="text-sm">
                            {vendor.vendorContact.name && <div>{vendor.vendorContact.name}</div>}
                            {vendor.vendorContact.email && (
                              <div className="text-blue-600">{vendor.vendorContact.email}</div>
                            )}
                            {vendor.vendorContact.phone && <div>{vendor.vendorContact.phone}</div>}
                            {vendor.vendorContact.website && (
                              <a
                                href={vendor.vendorContact.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Website
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

