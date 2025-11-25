'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Check, X, Eye, FileText, User, Calendar, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

interface TimeSubmission {
  id: string
  userId: string
  weekStart: string
  weekEnd: string
  status: string
  submittedAt: string | null
  approvedAt: string | null
  approvedById: string | null
  rejectedAt: string | null
  rejectedById: string | null
  rejectionReason: string | null
  user: {
    id: string
    name: string
    email: string
  }
  totalHours: number
  timeEntries: Array<{
    id: string
    date: string
    regularHours: number
    overtimeHours: number
    job: {
      jobNumber: string
      title: string
    }
    laborCode: {
      code: string
      name: string
    } | null
  }>
}

interface Employee {
  id: string
  name: string | null
  email: string
  isActive: boolean
}

interface TimeApprovalsProps {
  currentUserId?: string
}

export function TimeApprovals({ currentUserId }: TimeApprovalsProps) {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [submissions, setSubmissions] = useState<TimeSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<TimeSubmission | null>(null)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Use ref to persist employees list across re-renders
  const employeesRef = useRef<Employee[]>([])
  
  // Week selector state - default to current week
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const today = new Date()
    return startOfWeek(today, { weekStartsOn: 0 }) // Sunday
  })

  // Load employees on mount and whenever they might be missing
  useEffect(() => {
    loadEmployees()
  }, []) // Load once on mount

  // Reload employees if list becomes empty (safety check)
  useEffect(() => {
    if (employees.length === 0 && employeesRef.current.length > 0) {
      // Restore from ref if state was cleared
      console.log('[TimeApprovals] Employees list is empty, restoring from ref...')
      setEmployees(employeesRef.current)
    } else if (employees.length === 0) {
      // Only reload if ref is also empty
      console.log('[TimeApprovals] Employees list is empty, reloading...')
      loadEmployees()
    }
  }, [employees.length, selectedWeekStart]) // Check when week changes or employees count changes

  // Load submissions when week changes
  useEffect(() => {
    loadSubmissions()
  }, [selectedWeekStart])

  const loadEmployees = async () => {
    try {
      // Always load employees - don't check if already loaded to ensure they persist
      const response = await fetch('/api/employees?includeInactive=false')
      if (response.ok) {
        const data = await response.json()
        console.log('[TimeApprovals] Employees API response:', data)
        // Handle both array and object responses
        const employeesList = Array.isArray(data) ? data : (data.employees || data.data || [])
        // Show all employees (including current user) so they can see their own submissions
        if (employeesList.length > 0) {
          employeesRef.current = employeesList // Store in ref
          setEmployees(employeesList) // Update state
          console.log('[TimeApprovals] Loaded', employeesList.length, 'employees')
        }
      }
    } catch (error) {
      console.error('Error loading employees:', error)
    }
  }

  const loadSubmissions = async () => {
    setIsLoading(true)
    try {
      // Fetch all SUBMITTED submissions first, then filter by week if needed
      const response = await fetch(`/api/timesheet-submissions?status=SUBMITTED`)
      if (response.ok) {
        const data = await response.json()
        // Handle both array and object responses - API returns { success: true, data: [...] }
        let submissionsData: any[] = []
        if (Array.isArray(data)) {
          submissionsData = data
        } else if (data && typeof data === 'object') {
          // API returns { success: true, data: [...] }
          if (data.data && Array.isArray(data.data)) {
            submissionsData = data.data
          } else if (data.submissions && Array.isArray(data.submissions)) {
            submissionsData = data.submissions
          }
        }
        
        console.log('[TimeApprovals] Parsed submissions:', submissionsData.length)
        
        // Filter for time submissions (submissions with timeEntries that have jobId) and match selected week
        const timeSubmissions = Array.isArray(submissionsData)
          ? submissionsData
              .filter((sub: any) => {
                // Filter by selected week first - compare week start dates (ignore time)
                const subWeekStart = new Date(sub.weekStart)
                const selectedWeek = new Date(selectedWeekStart)
                
                // Normalize both dates to midnight UTC for comparison
                const subWeekDate = new Date(Date.UTC(
                  subWeekStart.getUTCFullYear(),
                  subWeekStart.getUTCMonth(),
                  subWeekStart.getUTCDate()
                ))
                const selectedWeekDate = new Date(Date.UTC(
                  selectedWeek.getUTCFullYear(),
                  selectedWeek.getUTCMonth(),
                  selectedWeek.getUTCDate()
                ))
                
                if (subWeekDate.getTime() !== selectedWeekDate.getTime()) {
                  return false // Not for the selected week
                }
                
                // Time submissions have timeEntries with jobId OR type === 'TIME'
                const hasJobEntries = sub.timeEntries && Array.isArray(sub.timeEntries) && sub.timeEntries.some((te: any) => te.jobId)
                const isTimeType = sub.type === 'TIME'
                return hasJobEntries || isTimeType
              })
              .map((sub: any) => {
                // Calculate total hours from timeEntries
                const totalHours = Array.isArray(sub.timeEntries) 
                  ? sub.timeEntries.reduce((sum: number, entry: any) => 
                      sum + (entry.regularHours || 0) + (entry.overtimeHours || 0), 0) 
                  : 0
                // Sort time entries by date (oldest first - Sunday on top)
                const sortedTimeEntries = Array.isArray(sub.timeEntries)
                  ? [...sub.timeEntries].sort((a: any, b: any) => {
                      const dateA = new Date(a.date).getTime()
                      const dateB = new Date(b.date).getTime()
                      return dateA - dateB // Oldest first
                    })
                  : sub.timeEntries || []
                return { ...sub, totalHours, timeEntries: sortedTimeEntries }
              })
          : []
        
        setSubmissions(timeSubmissions)
      }
    } catch (error) {
      console.error('Error loading time submissions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load time submissions',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (submissionId: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/timesheet-submissions/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Time submission approved successfully'
        })
        setIsApprovalDialogOpen(false)
        setSelectedSubmission(null)
        loadSubmissions()
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to approve submission',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve submission',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (submissionId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/timesheet-submissions/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectionReason
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Time submission rejected'
        })
        setIsRejectionDialogOpen(false)
        setSelectedSubmission(null)
        setRejectionReason('')
        loadSubmissions()
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to reject submission',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject submission',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case 'SUBMITTED':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Not Submitted</Badge>
    }
  }

  // Get submission for an employee
  const getSubmissionForEmployee = (employeeId: string): TimeSubmission | null => {
    return submissions.find(sub => sub.userId === employeeId) || null
  }

  // Filter employees by search query
  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query)
    )
  })

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedWeekStart(subWeeks(selectedWeekStart, 1))
    } else {
      setSelectedWeekStart(addWeeks(selectedWeekStart, 1))
    }
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    setSelectedWeekStart(startOfWeek(today, { weekStartsOn: 0 }))
  }

  const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 0 })
  const weekRange = `${format(selectedWeekStart, 'M/d')} - ${format(weekEnd, 'M/d')}`

  if (isLoading && employees.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-8 w-8 mx-auto mb-2 animate-spin" />
        <p>Loading time approvals...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Week Selector and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Week Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{weekRange}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
              >
                Today
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading && employees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading employees and submissions...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No employees found</p>
              <p className="text-sm">{searchQuery ? 'Try a different search term' : 'No employees available'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const submission = getSubmissionForEmployee(employee.id)
                    const status = submission?.status || 'NOT_SUBMITTED'
                    // Show approve/reject buttons for any submission that exists (SUBMITTED status)
                    const showApproveReject = submission && (status === 'SUBMITTED' || status?.toUpperCase() === 'SUBMITTED')
                    
                    return (
                      <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                            {employee.name || employee.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                            {weekRange}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                            {submission ? submission.totalHours.toFixed(2) + 'h' : '—'}
                        </div>
                      </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell>
                          {submission?.submittedAt
                          ? format(new Date(submission.submittedAt), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            {submission && (
                              <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSubmission(submission)
                              setIsDetailsDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                                {showApproveReject && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-700 border-green-300 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedSubmission(submission)
                                  setIsApprovalDialogOpen(true)
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedSubmission(submission)
                                  setIsRejectionDialogOpen(true)
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                                  </>
                                )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Time Submission Details</DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <>
                  {selectedSubmission.user.name || selectedSubmission.user.email} - {weekRange}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Total Hours</Label>
                  <p className="text-lg font-bold">{selectedSubmission.totalHours.toFixed(2)}h</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                </div>
              </div>
              
              {selectedSubmission.status === 'REJECTED' && selectedSubmission.rejectionReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-sm font-semibold text-red-900 mb-2 block">Rejection Reason:</Label>
                  <p className="text-sm text-red-800">{selectedSubmission.rejectionReason}</p>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-semibold mb-2 block">Time Entries</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Labor Code</TableHead>
                        <TableHead>Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSubmission.timeEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{entry.job.jobNumber} - {entry.job.title}</TableCell>
                          <TableCell>{entry.laborCode?.code || '—'}</TableCell>
                          <TableCell>{(entry.regularHours + (entry.overtimeHours || 0)).toFixed(2)}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Time Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this time submission? Once approved, the entries will be locked from further editing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApprovalDialogOpen(false)
                setSelectedSubmission(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedSubmission && handleApprove(selectedSubmission.id)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Time Submission</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this time submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectionDialogOpen(false)
                setSelectedSubmission(null)
                setRejectionReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedSubmission && handleReject(selectedSubmission.id)}
              disabled={isProcessing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessing ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
