'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Clock, FileText, X, Send, Loader2 } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { calculateHoursBetween } from '@/lib/utils/time-rounding'
import { useToast } from '@/components/ui/use-toast'

interface TimesheetEntry {
  id: string
  userId: string
  date: string
  clockInTime: string
  clockOutTime: string | null
  totalHours: number | null
  status: string
  jobEntries: JobEntry[]
}

interface JobEntry {
  id: string
  jobNumber: string
  laborCode: string
  punchInTime: string
  punchOutTime: string | null
  notes: string | null
}

interface DayTimesheetModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  timesheets: TimesheetEntry[]
  onAddEntry: (date?: Date) => void
  onEditEntry: (entry: TimesheetEntry) => void
  userId: string
  jobs: Array<{ id: string; jobNumber: string; title: string }>
  laborCodes: Array<{ id: string; code: string; name: string }>
  getCurrentDate?: () => Date
}

export function DayTimesheetModal({
  isOpen,
  onClose,
  selectedDate,
  timesheets,
  onAddEntry,
  onEditEntry,
  userId,
  jobs,
  laborCodes,
  getCurrentDate
}: DayTimesheetModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const dayTimesheets = selectedDate ? timesheets.filter(ts => {
    const tsDate = new Date(ts.date)
    return tsDate.toDateString() === selectedDate.toDateString()
  }) : []

  const calculateEntryHours = (entry: TimesheetEntry): number => {
    if (entry.totalHours) return entry.totalHours
    if (entry.clockOutTime) {
      const inTime = new Date(entry.clockInTime)
      const outTime = new Date(entry.clockOutTime)
      return (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
    }
    return 0
  }

  const calculateJobHours = (job: JobEntry): number => {
    if (job.punchOutTime) {
      const inTime = new Date(job.punchInTime)
      const outTime = new Date(job.punchOutTime)
      return (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
    }
    return 0
  }

  // Total hours should only include clock in/out entries, not job entries
  const totalDayHours = dayTimesheets
    .filter(ts => ts.jobEntries.length === 0) // Only clock in/out entries
    .reduce((sum, ts) => sum + calculateEntryHours(ts), 0)

  const handleSubmitForApproval = async () => {
    if (!selectedDate) return

    // Convert timesheet entries to submission format
    const timeEntries: any[] = []
    
    for (const ts of dayTimesheets) {
      // Only process entries with job entries (skip clock in/out only entries)
      if (ts.jobEntries.length > 0) {
        for (const jobEntry of ts.jobEntries) {
          // Find job by jobNumber
          const job = jobs.find(j => j.jobNumber === jobEntry.jobNumber)
          if (!job) {
            toast({
              title: 'Error',
              description: `Job ${jobEntry.jobNumber} not found`,
              variant: 'destructive'
            })
            return
          }

          // Find labor code by code
          const laborCode = laborCodes.find(lc => lc.code === jobEntry.laborCode)
          const laborCodeId = laborCode?.id || null

          // Calculate hours
          let regularHours = 0
          if (jobEntry.punchOutTime) {
            const inTime = new Date(jobEntry.punchInTime)
            const outTime = new Date(jobEntry.punchOutTime)
            regularHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
          }

          timeEntries.push({
            date: format(selectedDate, 'yyyy-MM-dd'),
            regularHours: Math.max(0, regularHours),
            overtimeHours: 0,
            notes: jobEntry.notes || null,
            billable: true,
            jobId: job.id,
            laborCodeId: laborCodeId
          })
        }
      }
    }

    if (timeEntries.length === 0) {
      toast({
        title: 'No entries to submit',
        description: 'Please add job entries before submitting',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Use the selected date as both weekStart and weekEnd for daily submission
      const weekStart = startOfDay(selectedDate)
      const weekEnd = endOfDay(selectedDate)

      const response = await fetch('/api/timesheet-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          timeEntries
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Timesheet submitted for approval',
        })
        onClose()
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to submit timesheet',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit timesheet',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen && !!selectedDate} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full mx-2 sm:mx-auto">
        <DialogHeader className="pb-3 sm:pb-4 border-b relative">
          <div className="flex items-center justify-between pr-8 sm:pr-12">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-2xl font-bold truncate flex-1 min-w-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="hidden sm:inline">Timesheet for </span>
              <span className="truncate">{selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : ''}</span>
            </DialogTitle>
            <div className="flex items-center gap-1 sm:gap-2" style={{ position: 'absolute', right: '45px', top: '0' }}>
              <Button
                onClick={() => {
                  // Ask parent for the freshest current date at click time
                  if (getCurrentDate) {
                    const date = getCurrentDate()
                    onAddEntry(startOfDay(date))
                  } else {
                    // Fallback to selectedDate if getter not provided
                    const dateToUse = selectedDate || new Date()
                    onAddEntry(startOfDay(dateToUse))
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 px-3 sm:px-4 py-2 rounded-lg min-h-[44px]"
                size="sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Add Entry</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 sm:mt-6 flex-1 overflow-y-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          {dayTimesheets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No entries for this day</p>
              <p className="text-sm">Click "Add Entry" to create a new timesheet entry</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Clock In/Out Entries */}
              {dayTimesheets.filter(ts => ts.jobEntries.length === 0).length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    Clock In/Out Entries
                  </h3>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-xs sm:text-sm">Clock In</TableHead>
                          <TableHead className="font-semibold text-xs sm:text-sm">Clock Out</TableHead>
                          <TableHead className="font-semibold text-xs sm:text-sm">Total Hours</TableHead>
                          <TableHead className="font-semibold text-xs sm:text-sm">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayTimesheets
                          .filter(ts => ts.jobEntries.length === 0)
                          .map((ts) => (
                            <TableRow 
                              key={ts.id} 
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => onEditEntry(ts)}
                            >
                              <TableCell className="font-medium">
                                {format(new Date(ts.clockInTime), 'h:mm a')}
                              </TableCell>
                              <TableCell>
                                {ts.clockOutTime ? (
                                  format(new Date(ts.clockOutTime), 'h:mm a')
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {calculateEntryHours(ts).toFixed(2)}h
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  ts.status === 'completed' 
                                    ? 'bg-green-100 text-green-800'
                                    : ts.status === 'in-progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {ts.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Job Entries */}
              {dayTimesheets.filter(ts => ts.jobEntries.length > 0).length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    Job Entries
                  </h3>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-xs sm:text-sm">Start Time</TableHead>
                          <TableHead className="font-semibold text-xs sm:text-sm">End Time</TableHead>
                          <TableHead className="font-semibold text-xs sm:text-sm">Job Number</TableHead>
                          <TableHead className="font-semibold text-xs sm:text-sm">Labor Code</TableHead>
                          <TableHead className="font-semibold text-xs sm:text-sm">Hours</TableHead>
                          <TableHead className="font-semibold text-xs sm:text-sm">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayTimesheets
                          .filter(ts => ts.jobEntries.length > 0)
                          .flatMap(ts => 
                            ts.jobEntries.map(job => ({ timesheet: ts, job }))
                          )
                          .map(({ timesheet, job }) => (
                            <TableRow 
                              key={job.id} 
                              className="hover:bg-green-50 cursor-pointer transition-colors"
                              onClick={() => onEditEntry(timesheet)}
                            >
                              <TableCell className="font-medium">
                                {format(new Date(job.punchInTime), 'h:mm a')}
                              </TableCell>
                              <TableCell>
                                {job.punchOutTime ? (
                                  format(new Date(job.punchOutTime), 'h:mm a')
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {job.jobNumber}
                              </TableCell>
                              <TableCell>
                                {job.laborCode}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {calculateJobHours(job).toFixed(2)}h
                              </TableCell>
                              <TableCell className="max-w-xs">
                                {job.notes ? (
                                  <span className="text-sm text-gray-600 truncate block" title={job.notes}>
                                    {job.notes}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Total Hours Summary */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    <span className="text-sm sm:text-lg font-semibold text-gray-900">Total Hours for Day:</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-700">
                    {totalDayHours.toFixed(2)}h
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button - Below total hours, always visible */}
        <div className="flex justify-end pt-3 sm:pt-4 border-t mt-3 sm:mt-4 px-2 sm:px-0">
          <Button
            onClick={handleSubmitForApproval}
            disabled={isSubmitting || dayTimesheets.filter(ts => ts.jobEntries.length > 0).length === 0}
            className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

