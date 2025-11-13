'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Check, X, Eye, FileText, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
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

export function TimeApprovals() {
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<TimeSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<TimeSubmission | null>(null)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/timesheet-submissions')
      if (response.ok) {
        const data = await response.json()
        // Filter for time submissions (submissions with timeEntries that have jobId)
        // Attendance submissions have timesheets but no job-related timeEntries
        const timeSubmissions = data
          .filter((sub: any) => {
            // Time submissions have timeEntries with jobId
            const hasJobEntries = sub.timeEntries && sub.timeEntries.some((te: any) => te.jobId)
            return hasJobEntries
          })
          .map((sub: any) => {
            // Calculate total hours from timeEntries
            const totalHours = sub.timeEntries?.reduce((sum: number, entry: any) => 
              sum + (entry.regularHours || 0) + (entry.overtimeHours || 0), 0) || 0
            return { ...sub, totalHours }
          })
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
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-8 w-8 mx-auto mb-2 animate-spin" />
        <p>Loading time approvals...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No time submissions</p>
              <p className="text-sm">Time approval submissions will appear here</p>
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
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          {submission.user.name || submission.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {format(new Date(submission.weekStart), 'MMM d')} - {format(new Date(submission.weekEnd), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          {submission.totalHours.toFixed(2)}h
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        {submission.submittedAt
                          ? format(new Date(submission.submittedAt), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
                          {submission.status === 'SUBMITTED' && (
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
              View all time entries for this submission
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Employee</Label>
                  <p>{selectedSubmission.user.name || selectedSubmission.user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Date Range</Label>
                  <p>
                    {format(new Date(selectedSubmission.weekStart), 'MMM d')} - {format(new Date(selectedSubmission.weekEnd), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Total Hours</Label>
                  <p>{selectedSubmission.totalHours.toFixed(2)}h</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <div>{getStatusBadge(selectedSubmission.status)}</div>
                </div>
              </div>
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
                          <TableCell>{entry.regularHours.toFixed(2)}h</TableCell>
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



