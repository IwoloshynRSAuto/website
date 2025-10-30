'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Activity,
  RefreshCw
} from 'lucide-react'

interface TimeTrackingSummary {
  totalActiveJobs: number
  totalEstimatedHours: number
  totalActualHours: number
  totalOverrunHours: number
  overrunJobs: number
  totalEstimatedCost: number
  totalActualCost: number
  totalOverrunCost: number
  lastUpdated: string
}

interface RealtimeTimeWidgetProps {
  initialData?: TimeTrackingSummary
}

export function RealtimeTimeWidget({ initialData }: RealtimeTimeWidgetProps) {
  const [data, setData] = useState<TimeTrackingSummary | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/jobs/time-tracking')
      if (response.ok) {
        const jobs = await response.json()
        
        // Calculate summary data
        const summary: TimeTrackingSummary = {
          totalActiveJobs: jobs.length,
          totalEstimatedHours: jobs.reduce((sum: number, job: any) => sum + job.estimatedHours, 0),
          totalActualHours: jobs.reduce((sum: number, job: any) => sum + job.actualHours, 0),
          totalOverrunHours: jobs.reduce((sum: number, job: any) => 
            sum + Math.max(0, job.actualHours - job.estimatedHours), 0),
          overrunJobs: jobs.filter((job: any) => job.isOverrun).length,
          totalEstimatedCost: jobs.reduce((sum: number, job: any) => sum + job.estimatedCost, 0),
          totalActualCost: jobs.reduce((sum: number, job: any) => sum + job.actualCost, 0),
          totalOverrunCost: jobs.reduce((sum: number, job: any) => sum + job.overrunAmount, 0),
          lastUpdated: new Date().toISOString()
        }
        
        setData(summary)
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error('Error fetching time tracking data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading time tracking data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = data.totalEstimatedHours > 0 
    ? (data.totalActualHours / data.totalEstimatedHours) * 100 
    : 0

  const isOverrun = data.totalActualHours > data.totalEstimatedHours

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Real-Time Time Tracking</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Hours Progress</span>
            <span className={`font-medium ${isOverrun ? 'text-red-600' : 'text-green-600'}`}>
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={Math.min(progressPercentage, 100)} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{data.totalActualHours.toFixed(1)}h logged</span>
            <span>{data.totalEstimatedHours.toFixed(1)}h estimated</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{data.totalActiveJobs}</div>
            <div className="text-sm text-gray-600">Active Jobs</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${data.overrunJobs > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.overrunJobs}
            </div>
            <div className="text-sm text-gray-600">Overrun Jobs</div>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Estimated Cost:</span>
            <span className="font-medium">${data.totalEstimatedCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Actual Cost:</span>
            <span className={`font-medium ${isOverrun ? 'text-red-600' : 'text-green-600'}`}>
              ${data.totalActualCost.toFixed(2)}
            </span>
          </div>
          {data.totalOverrunCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Overrun Cost:</span>
              <span className="font-medium text-red-600">
                +${data.totalOverrunCost.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {data.overrunJobs > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-800">
                {data.overrunJobs} job{data.overrunJobs > 1 ? 's' : ''} overrun
              </span>
            </div>
            <p className="text-xs text-red-700 mt-1">
              Total overrun: {data.totalOverrunHours.toFixed(1)} hours
            </p>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-gray-500 text-center">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}




