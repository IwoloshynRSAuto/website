'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  BarChart3,
} from 'lucide-react'

interface QuoteMetrics {
  winLossRate: {
    total: number
    won: number
    lost: number
    sent: number
    draft: number
    winRate: number
    lossRate: number
  }
  profitPerJob: {
    totalQuoted: number
    totalWon: number
    totalProfit: number
    averageQuoteValue: number
    averageWonValue: number
    averageProfit: number
  }
  turnaround: {
    averageDays: number
    fastestDays: number
    slowestDays: number
    byStatus: {
      won: number
      lost: number
      sent: number
    }
  }
  jobTypeAnalysis: {
    mostProfitable: Array<{
      quoteType: string
      count: number
      totalValue: number
      averageValue: number
      winRate: number
    }>
    leastProfitable: Array<{
      quoteType: string
      count: number
      totalValue: number
      averageValue: number
      winRate: number
    }>
  }
  lostReasons: Array<{
    reason: string
    count: number
    totalValue: number
    percentage: number
  }>
}

export function QuoteMetricsDashboard() {
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<QuoteMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
  })

  useEffect(() => {
    loadMetrics()
  }, [filters])

  const loadMetrics = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filters.year) params.append('year', filters.year.toString())
      if (filters.month) params.append('month', filters.month.toString())

      const response = await fetch(`/api/metrics/quote?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data.data)
    } catch (error) {
      console.error('Error loading metrics:', error)
      toast({
        title: 'Error',
        description: 'Failed to load quote metrics',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading metrics...</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-gray-500">No metrics data available</div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quote Metrics</CardTitle>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Year"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) || new Date().getFullYear() })}
                className="w-24"
              />
              <Select
                value={filters.month || "all"}
                onValueChange={(value) => setFilters({ ...filters, month: value === "all" ? "" : value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <div className="text-sm text-gray-600">Win Rate</div>
                </div>
                <div className="text-2xl font-bold">{metrics.winLossRate.winRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.winLossRate.won} / {metrics.winLossRate.total}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <div className="text-sm text-gray-600">Avg Profit</div>
                </div>
                <div className="text-2xl font-bold">
                  ${metrics.profitPerJob.averageProfit.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Total: ${metrics.profitPerJob.totalProfit.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <div className="text-sm text-gray-600">Avg Turnaround</div>
                </div>
                <div className="text-2xl font-bold">{metrics.turnaround.averageDays.toFixed(0)} days</div>
                <div className="text-xs text-gray-500 mt-1">
                  Fastest: {metrics.turnaround.fastestDays}d | Slowest: {metrics.turnaround.slowestDays}d
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                  <div className="text-sm text-gray-600">Total Quoted</div>
                </div>
                <div className="text-2xl font-bold">
                  ${metrics.profitPerJob.totalQuoted.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Won: ${metrics.profitPerJob.totalWon.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Profitable Job Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.jobTypeAnalysis.mostProfitable.map((type) => (
                    <div key={type.quoteType} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{type.quoteType}</div>
                        <div className="text-xs text-gray-500">
                          {type.count} quotes | {type.winRate.toFixed(1)}% win rate
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${type.averageValue.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">avg value</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lost Quote Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.lostReasons.map((reason) => (
                    <div key={reason.reason} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{reason.reason}</div>
                        <div className="text-xs text-gray-500">
                          {reason.count} quotes | ${reason.totalValue.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{reason.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

