'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, differenceInDays, startOfWeek, endOfWeek, addDays, isWithinInterval } from 'date-fns'
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'

interface Milestone {
  id: string
  name: string
  description: string | null
  milestoneType: string
  scheduledStartDate: string | null
  scheduledEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  status: string
  billingPercentage: number | null
  isBillingTrigger: boolean
}

interface MilestoneGanttViewProps {
  milestones: Milestone[]
}

export function MilestoneGanttView({ milestones }: MilestoneGanttViewProps) {
  // Calculate date range for the Gantt chart
  const dateRange = useMemo(() => {
    if (milestones.length === 0) {
      const today = new Date()
      return {
        start: startOfWeek(today, { weekStartsOn: 0 }),
        end: endOfWeek(addDays(today, 30), { weekStartsOn: 0 }),
      }
    }

    const allDates: Date[] = []
    milestones.forEach(m => {
      if (m.scheduledStartDate) allDates.push(new Date(m.scheduledStartDate))
      if (m.scheduledEndDate) allDates.push(new Date(m.scheduledEndDate))
      if (m.actualStartDate) allDates.push(new Date(m.actualStartDate))
      if (m.actualEndDate) allDates.push(new Date(m.actualEndDate))
    })

    if (allDates.length === 0) {
      const today = new Date()
      return {
        start: startOfWeek(today, { weekStartsOn: 0 }),
        end: endOfWeek(addDays(today, 30), { weekStartsOn: 0 }),
      }
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
    
    // Add padding
    const paddingDays = 7
    return {
      start: startOfWeek(addDays(minDate, -paddingDays), { weekStartsOn: 0 }),
      end: endOfWeek(addDays(maxDate, paddingDays), { weekStartsOn: 0 }),
    }
  }, [milestones])

  const totalDays = differenceInDays(dateRange.end, dateRange.start)
  const today = new Date()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500'
      case 'IN_PROGRESS':
        return 'bg-blue-500'
      case 'BLOCKED':
        return 'bg-red-500'
      case 'NOT_STARTED':
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'BLOCKED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'NOT_STARTED':
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const calculateBarPosition = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null

    const start = new Date(startDate)
    const end = new Date(endDate)
    
    const daysFromStart = differenceInDays(start, dateRange.start)
    const duration = differenceInDays(end, start)
    
    const leftPercent = (daysFromStart / totalDays) * 100
    const widthPercent = (duration / totalDays) * 100

    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(100, widthPercent)}%`,
    }
  }

  // Generate week markers
  const weekMarkers = useMemo(() => {
    const markers: Date[] = []
    let current = new Date(dateRange.start)
    while (current <= dateRange.end) {
      markers.push(new Date(current))
      current = addDays(current, 7)
    }
    return markers
  }, [dateRange])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestone Timeline (Gantt View)</CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No milestones found. Add milestones to see the timeline.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timeline Header */}
            <div className="relative border-b pb-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>{format(dateRange.start, 'MMM d, yyyy')}</span>
                <span>{format(dateRange.end, 'MMM d, yyyy')}</span>
              </div>
              <div className="relative h-8">
                {/* Today marker */}
                {isWithinInterval(today, { start: dateRange.start, end: dateRange.end }) && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                    style={{
                      left: `${(differenceInDays(today, dateRange.start) / totalDays) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-red-600 font-medium">
                      Today
                    </div>
                  </div>
                )}
                {/* Week markers */}
                {weekMarkers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 w-px bg-gray-200"
                    style={{
                      left: `${(differenceInDays(marker, dateRange.start) / totalDays) * 100}%`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Milestone Bars */}
            <div className="space-y-3">
              {milestones.map((milestone) => {
                const scheduledPos = calculateBarPosition(
                  milestone.scheduledStartDate,
                  milestone.scheduledEndDate
                )
                const actualPos = milestone.actualStartDate && milestone.actualEndDate
                  ? calculateBarPosition(milestone.actualStartDate, milestone.actualEndDate)
                  : null

                return (
                  <div key={milestone.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(milestone.status)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{milestone.name}</div>
                          {milestone.description && (
                            <div className="text-xs text-gray-500 truncate">{milestone.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {milestone.milestoneType}
                        </Badge>
                        <Badge
                          variant={
                            milestone.status === 'COMPLETED'
                              ? 'default'
                              : milestone.status === 'IN_PROGRESS'
                              ? 'secondary'
                              : milestone.status === 'BLOCKED'
                              ? 'destructive'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {milestone.status.replace('_', ' ')}
                        </Badge>
                        {milestone.isBillingTrigger && (
                          <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                            Billing
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Gantt Bar */}
                    <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
                      {/* Scheduled bar */}
                      {scheduledPos && (
                        <div
                          className="absolute top-0 bottom-0 border-r border-l border-gray-300 bg-gray-200 opacity-50"
                          style={{
                            left: scheduledPos.left,
                            width: scheduledPos.width,
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
                            {milestone.scheduledStartDate && milestone.scheduledEndDate && (
                              <>
                                {format(new Date(milestone.scheduledStartDate), 'MMM d')} -{' '}
                                {format(new Date(milestone.scheduledEndDate), 'MMM d')}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actual bar */}
                      {actualPos && (
                        <div
                          className={`absolute top-0 bottom-0 ${getStatusColor(milestone.status)} rounded`}
                          style={{
                            left: actualPos.left,
                            width: actualPos.width,
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                            {milestone.actualStartDate && milestone.actualEndDate && (
                              <>
                                {format(new Date(milestone.actualStartDate), 'MMM d')} -{' '}
                                {format(new Date(milestone.actualEndDate), 'MMM d')}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* No dates message */}
                      {!scheduledPos && !actualPos && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                          No dates set
                        </div>
                      )}
                    </div>

                    {/* Date details */}
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <div className="font-medium">Scheduled:</div>
                        <div>
                          {milestone.scheduledStartDate && milestone.scheduledEndDate ? (
                            <>
                              {format(new Date(milestone.scheduledStartDate), 'MMM d, yyyy')} -{' '}
                              {format(new Date(milestone.scheduledEndDate), 'MMM d, yyyy')}
                            </>
                          ) : (
                            <span className="text-gray-400">Not scheduled</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Actual:</div>
                        <div>
                          {milestone.actualStartDate && milestone.actualEndDate ? (
                            <>
                              {format(new Date(milestone.actualStartDate), 'MMM d, yyyy')} -{' '}
                              {format(new Date(milestone.actualEndDate), 'MMM d, yyyy')}
                            </>
                          ) : (
                            <span className="text-gray-400">Not started</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t">
              <div className="text-xs font-medium text-gray-700 mb-2">Legend:</div>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 opacity-50 border border-gray-300" />
                  <span>Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500" />
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500" />
                  <span>Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400" />
                  <span>Not Started</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-red-500" />
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

