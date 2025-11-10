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
import { Check, X, Eye, Clock, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

interface AttendanceSubmission {
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
}

export function AttendanceApprovals() {
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<AttendanceSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<AttendanceSubmission | null>(null)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    setIsLoading(true)
    try {
      // TODO: Create API endpoint for attendance submissions
      // For now, using placeholder - will need to filter timesheet submissions by type
      const response = await fetch('/api/timesheet-submissions')
      if (response.ok) {
        const data = await response.json()
        // Filter for attendance-only submissions (entries with no job entries)
        // This is a placeholder - actual implementation will depend on backend structure
        setSubmissions([])
      }
    } catch (error) {
      console.error('Error loading attendance submissions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load attendance submissions',
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
          description: 'Attendance submission approved successfully'
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
          description: 'Attendance submission rejected'
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
        <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
        <p>Loading attendance approvals...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No attendance submissions</p>
              <p className="text-sm">Attendance approval submissions will appear here</p>
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
                          <Clock className="h-4 w-4 text-gray-500" />
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
                              // TODO: Open details modal
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

      {/* Approval Confirmation Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Attendance Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this attendance submission? Once approved, the entries will be locked from further editing.
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
            <DialogTitle>Reject Attendance Submission</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this attendance submission.
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



