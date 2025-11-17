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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Target,
} from 'lucide-react'

interface JobMetrics {
  jobId: string
  jobNumber: string
  title: string
  quotedVsActual: {
    quotedCost: number
    actualCost: number
    variance: number
    variancePercent: number
    quotedHours: number
    actualHours: number
    hoursVariance: number
    hoursVariancePercent: number
  }
  profitability: {
    revenue: number
    laborCost: number
    materialCost: number
    totalCost: number
    profit: number
    profitMargin: number
  }
  scheduleVariance: {
    estimatedDuration: number
    actualDuration: number | null
    variance: number | null
    onSchedule: boolean
  }
}

export function JobMetricsDashboard() {
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<JobMetrics[]>([])
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

      const response = await fetch(`/api/metrics/job?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data.data || [])
    } catch (error) {
      console.error('Error loading metrics:', error)
      toast({
        title: 'Error',
        description: 'Failed to load job metrics',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate aggregate metrics
  const aggregateMetrics = metrics.reduce(
    (acc, job) => ({
      totalRevenue: acc.totalRevenue + job.profitability.revenue,
      totalCost: acc.totalCost + job.profitability.totalCost,
      totalProfit: acc.totalProfit + job.profitability.profit,
      totalQuotedHours: acc.totalQuotedHours + job.quotedVsActual.quotedHours,
      totalActualHours: acc.totalActualHours + job.quotedVsActual.actualHours,
      onSchedule: acc.onSchedule + (job.scheduleVariance.onSchedule ? 1 : 0),
    }),
    {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalQuotedHours: 0,
      totalActualHours: 0,
      onSchedule: 0,
    }
  )

  const overallProfitMargin = aggregateMetrics.totalRevenue > 0
    ? (aggregateMetrics.totalProfit / aggregateMetrics.totalRevenue) * 100
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading metrics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Job Metrics</CardTitle>
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
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                <div className="text-2xl font-bold">
                  ${aggregateMetrics.totalRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div className="text-sm text-gray-600">Total Profit</div>
                </div>
                <div className="text-2xl font-bold">
                  ${aggregateMetrics.totalProfit.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Margin: {overallProfitMargin.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <div className="text-sm text-gray-600">Hours Variance</div>
                </div>
                <div className="text-2xl font-bold">
                  {aggregateMetrics.totalActualHours.toFixed(0)}h
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Quoted: {aggregateMetrics.totalQuotedHours.toFixed(0)}h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  <div className="text-sm text-gray-600">On Schedule</div>
                </div>
                <div className="text-2xl font-bold">
                  {aggregateMetrics.onSchedule} / {metrics.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.length > 0
                    ? ((aggregateMetrics.onSchedule / metrics.length) * 100).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Job Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Job</th>
                    <th className="text-left p-2">Revenue</th>
                    <th className="text-left p-2">Cost</th>
                    <th className="text-left p-2">Profit</th>
                    <th className="text-left p-2">Margin</th>
                    <th className="text-left p-2">Hours Var</th>
                    <th className="text-left p-2">Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((job) => (
                    <tr key={job.jobId} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="font-medium">{job.title}</div>
                        <div className="text-xs text-gray-500">{job.jobNumber}</div>
                      </td>
                      <td className="p-2">${job.profitability.revenue.toLocaleString()}</td>
                      <td className="p-2">${job.profitability.totalCost.toLocaleString()}</td>
                      <td className={`p-2 font-semibold ${
                        job.profitability.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${job.profitability.profit.toLocaleString()}
                      </td>
                      <td className={`p-2 ${
                        job.profitability.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {job.profitability.profitMargin.toFixed(1)}%
                      </td>
                      <td className={`p-2 ${
                        job.quotedVsActual.hoursVariancePercent <= 10 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {job.quotedVsActual.hoursVariancePercent.toFixed(1)}%
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.scheduleVariance.onSchedule
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {job.scheduleVariance.onSchedule ? 'On Time' : 'Delayed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

