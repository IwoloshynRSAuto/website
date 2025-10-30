'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Check, X, Eye, Clock, User, Calendar, RotateCcw, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface TimesheetSubmission {
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
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
  }
  approvedBy: {
    id: string
    name: string
    email: string
  } | null
  rejectedBy: {
    id: string
    name: string
    email: string
  } | null
  timeEntries: Array<{
    id: string
    date: string
    regularHours: number
    overtimeHours: number
    notes: string | null
    billable: boolean
    rate: number | null
    job: {
      id: string
      jobNumber: string
      title: string
    }
    laborCode: {
      id: string
      code: string
      description: string
      hourlyRate: number
    } | null
  }>
}

interface TimesheetApprovalProps {
  submissions: TimesheetSubmission[]
}

export function TimesheetApproval({ submissions }: TimesheetApprovalProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<TimesheetSubmission | null>(null)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Debug: Log submissions to see what we're getting
  console.log('TimesheetApproval - submissions:', submissions)
  console.log('TimesheetApproval - approved submissions:', submissions.filter(s => s.status === 'APPROVED'))
  console.log('TimesheetApproval - rejected submissions:', submissions.filter(s => s.status === 'REJECTED'))

  const handleApprove = async (submissionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/timesheet-submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED'
        }),
      })

      if (response.ok) {
        toast.success('Timesheet approved successfully!')
        setIsApprovalDialogOpen(false)
        setSelectedSubmission(null)
        // Refresh the page to show updated status
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to approve timesheet: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error approving timesheet:', error)
      toast.error('Failed to approve timesheet')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async (submissionId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/timesheet-submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectionReason
        }),
      })

      if (response.ok) {
        toast.success('Timesheet rejected successfully!')
        setIsRejectionDialogOpen(false)
        setSelectedSubmission(null)
        setRejectionReason('')
        // Refresh the page to show updated status
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to reject timesheet: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error)
      toast.error('Failed to reject timesheet')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReopen = async (submissionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/timesheet-submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'DRAFT'
        })
      })

      if (response.ok) {
        toast.success('Timesheet reopened for editing!')
        // Refresh the page to show updated status
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to reopen timesheet: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error reopening timesheet:', error)
      toast.error('Failed to reopen timesheet')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this timesheet submission? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/timesheet-submissions/${submissionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Timesheet submission deleted successfully!')
        // Refresh the page to show updated list
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to delete timesheet: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error deleting timesheet:', error)
      toast.error('Failed to delete timesheet')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge className="bg-yellow-100 text-yellow-800">Submitted</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>
    }
  }

  const calculateTotalHours = (timeEntries: TimesheetSubmission['timeEntries']) => {
    return timeEntries.reduce((total, entry) => {
      return total + entry.regularHours + entry.overtimeHours
    }, 0)
  }

  const submittedSubmissions = submissions.filter(s => s.status === 'SUBMITTED')
  const approvedSubmissions = submissions.filter(s => s.status === 'APPROVED')
  const rejectedSubmissions = submissions.filter(s => s.status === 'REJECTED')

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittedSubmissions.length}</div>
            <p className="text-xs text-muted-foreground">
              Timesheets awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedSubmissions.length}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedSubmissions.length}</div>
            <p className="text-xs text-muted-foreground">
              Need revision
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{submission.user?.name || '[Deleted User]'}</div>
                        <div className="text-sm text-gray-500">{submission.user?.email || 'N/A'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">
                          {format(new Date(submission.weekStart), 'MMM dd')} - {format(new Date(submission.weekEnd), 'MMM dd')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(submission.weekStart), 'yyyy')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {calculateTotalHours(submission.timeEntries).toFixed(1)}h
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(submission.status)}
                  </TableCell>
                  <TableCell>
                    {submission.submittedAt ? (
                      <div className="text-sm">
                        {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not submitted</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center flex-wrap gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSubmission(submission)
                          setIsApprovalDialogOpen(true)
                        }}
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      
                      {/* Show Approve/Reject buttons for DRAFT and SUBMITTED status */}
                      {(submission.status === 'DRAFT' || submission.status === 'SUBMITTED') && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(submission.id)}
                            className="text-green-600 hover:text-green-700 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSubmission(submission)
                              setIsRejectionDialogOpen(true)
                            }}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {/* Show Reopen button for APPROVED and REJECTED status */}
                      {(submission.status === 'APPROVED' || submission.status === 'REJECTED') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReopen(submission.id)}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reopen
                        </Button>
                      )}
                      
                      {/* Show Delete button for all statuses */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(submission.id)}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Timesheet</DialogTitle>
            <DialogDescription>
              Review the timesheet details before approving.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Employee</Label>
                  <div className="text-sm">{selectedSubmission.user?.name || '[Deleted User]'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Week</Label>
                  <div className="text-sm">
                    {format(new Date(selectedSubmission.weekStart), 'MMM dd')} - {format(new Date(selectedSubmission.weekEnd), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Time Entries</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Labor Code</TableHead>
                      <TableHead>Regular</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSubmission.timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), 'MMM dd')}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{entry.job.jobNumber}</div>
                            <div className="text-sm text-gray-500">{entry.job.title}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.laborCode ? (
                            <div>
                              <div className="font-medium">{entry.laborCode.code}</div>
                              <div className="text-sm text-gray-500">{entry.laborCode.description}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">No code</span>
                          )}
                        </TableCell>
                        <TableCell>{entry.regularHours.toFixed(1)}h</TableCell>
                        <TableCell>{entry.overtimeHours.toFixed(1)}h</TableCell>
                        <TableCell className="font-medium">
                          {(entry.regularHours + entry.overtimeHours).toFixed(1)}h
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-sm text-gray-600 truncate">
                            {entry.notes || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedSubmission && handleApprove(selectedSubmission.id)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this timesheet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why this timesheet is being rejected..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedSubmission && handleReject(selectedSubmission.id)}
              disabled={isLoading || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="h-4 w-4 mr-2" />
              Reject Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}





