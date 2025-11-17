'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, Clock, DollarSign, Briefcase, Target, TrendingDown } from 'lucide-react'

interface CustomerMetrics {
  customer: {
    id: string
    name: string
  }
  year: number
  totalHours: number
  totalRevenue: number
  totalQuoted: number
  jobsCompleted: number
  jobsTotal: number
  quotesWon: number
  quotesTotal: number
  winRate: number
  activeJobs: number
}

interface CustomerMetricsDashboardProps {
  customerId: string
  initialMetrics?: CustomerMetrics | null
}

export function CustomerMetricsDashboard({ customerId, initialMetrics }: CustomerMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(initialMetrics || null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(!initialMetrics)
  const [historicalData, setHistoricalData] = useState<any[]>([])

  useEffect(() => {
    loadMetrics()
    loadHistoricalData()
  }, [year])

  const loadMetrics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/customers/${customerId}/metrics?year=${year}`)
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data.data)
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadHistoricalData = async () => {
    try {
      // Load data for last 5 years
      const years = Array.from({ length: 5 }, (_, i) => year - i)
      const promises = years.map(y => 
        fetch(`/api/customers/${customerId}/metrics?year=${y}`)
          .then(r => r.json())
          .then(d => ({ year: y, ...d.data }))
          .catch(() => null)
      )
      const results = await Promise.all(promises)
      setHistoricalData(results.filter(r => r !== null).reverse())
    } catch (error) {
      console.error('Error loading historical data:', error)
    }
  }

  if (isLoading) {
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

  const chartData = historicalData.map(d => ({
    year: d.year,
    hours: d.totalHours || 0,
    revenue: d.totalRevenue || 0,
    quoted: d.totalQuoted || 0,
    jobsCompleted: d.jobsCompleted || 0,
  }))

  const profitabilityData = historicalData.map(d => ({
    year: d.year,
    revenue: d.totalRevenue || 0,
    quoted: d.totalQuoted || 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Customer Metrics</h3>
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

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Hours</div>
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{metrics.totalHours.toFixed(1)}h</div>
            <div className="text-xs text-gray-500 mt-1">Year {year}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Revenue</div>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold">
              ${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">Year {year}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Jobs Completed</div>
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold">
              {metrics.jobsCompleted} / {metrics.jobsTotal}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.jobsTotal > 0 ? ((metrics.jobsCompleted / metrics.jobsTotal) * 100).toFixed(0) : 0}% completion rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Quote Win Rate</div>
              <Target className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.quotesWon} won / {metrics.quotesTotal} total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hours & Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="hours" fill="#3b82f6" name="Hours" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">No historical data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitability Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {profitabilityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={profitabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" />
                  <Line type="monotone" dataKey="quoted" stroke="#f59e0b" name="Quoted" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">No historical data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600 mb-2">Total Quoted</div>
            <div className="text-2xl font-bold">
              ${metrics.totalQuoted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">Year {year}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600 mb-2">Active Jobs</div>
            <div className="text-2xl font-bold text-blue-600">{metrics.activeJobs}</div>
            <div className="text-xs text-gray-500 mt-1">Currently in progress</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600 mb-2">Revenue vs Quoted</div>
            <div className="text-2xl font-bold">
              {metrics.totalQuoted > 0 ? ((metrics.totalRevenue / metrics.totalQuoted) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.totalRevenue >= metrics.totalQuoted ? (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Above quoted
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Below quoted
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

