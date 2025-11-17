'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Clock,
  TrendingUp,
  Target,
  BarChart3,
  Calendar,
  Briefcase,
} from 'lucide-react'

interface EmployeeMetrics {
  totalHours: number
  regularHours: number
  overtimeHours: number
  hoursByDiscipline: Array<{
    laborCode: string
    laborCodeName: string
    hours: number
  }>
  projectsWorked: number
  projectsList: Array<{
    jobId: string
    jobNumber: string
    title: string
    hours: number
  }>
  quotedVsActual: {
    quotedHours: number
    actualHours: number
    variance: number
    variancePercent: number
    accuracy: number
  }
  productivity: {
    averageHoursPerDay: number
    averageHoursPerWeek: number
    billableHours: number
    nonBillableHours: number
    billablePercentage: number
  }
}

export function EmployeeMetricsDashboard({ userId }: { userId?: string }) {
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<EmployeeMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
  })

  useEffect(() => {
    loadMetrics()
  }, [userId, filters])

  const loadMetrics = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (filters.year) params.append('year', filters.year.toString())
      if (filters.month) params.append('month', filters.month.toString())

      const response = await fetch(`/api/metrics/employee?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data.data)
    } catch (error) {
      console.error('Error loading metrics:', error)
      toast({
        title: 'Error',
        description: 'Failed to load employee metrics',
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
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Employee Metrics
            </CardTitle>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div className="text-sm text-gray-600">Total Hours</div>
                </div>
                <div className="text-2xl font-bold">{metrics.totalHours.toFixed(1)}h</div>
                <div className="text-xs text-gray-500 mt-1">
                  Regular: {metrics.regularHours.toFixed(1)}h | OT: {metrics.overtimeHours.toFixed(1)}h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
                <div className="text-2xl font-bold">{metrics.quotedVsActual.accuracy.toFixed(1)}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  Variance: {metrics.quotedVsActual.variancePercent.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div className="text-sm text-gray-600">Productivity</div>
                </div>
                <div className="text-2xl font-bold">{metrics.productivity.billablePercentage.toFixed(1)}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  Billable: {metrics.productivity.billableHours.toFixed(1)}h
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hours by Discipline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.hoursByDiscipline.slice(0, 5).map((item) => (
                    <div key={item.laborCode} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.laborCodeName}</div>
                        <div className="text-xs text-gray-500">{item.laborCode}</div>
                      </div>
                      <div className="font-semibold">{item.hours.toFixed(1)}h</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Projects Worked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.projectsList.slice(0, 5).map((project) => (
                    <div key={project.jobId} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{project.title}</div>
                        <div className="text-xs text-gray-500">{project.jobNumber}</div>
                      </div>
                      <div className="font-semibold">{project.hours.toFixed(1)}h</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Total Projects: {metrics.projectsWorked}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

