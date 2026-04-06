'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Check, X, Eye, Clock, User, Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

interface TimeChangeRequest {
  id: string
  timesheetId: string | null
  userId: string
  date: string
  originalClockInTime: string
  originalClockOutTime: string | null
  requestedClockInTime: string
  requestedClockOutTime: string | null
  reason: string
  status: string
  submittedAt: string
  approvedAt: string | null
  approvedById: string | null
  rejectedAt: string | null
  rejectedById: string | null
  rejectionReason: string | null
  user: {
    id: string
    name: string | null
    email: string | null
  }
  approvedBy?: {
    id: string
    name: string | null
    email: string | null
  } | null
  rejectedBy?: {
    id: string
    name: string | null
    email: string | null
  } | null
  timesheet?: {
    id: string
    date: string
    clockInTime: string
    clockOutTime: string | null
  } | null
}

interface TimeChangeApprovalsProps {
  compact?: boolean
}

export function TimeChangeApprovals({ compact = false }: TimeChangeApprovalsProps) {
  const { toast } = useToast()
  const [changeRequests, setChangeRequests] = useState<TimeChangeRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<TimeChangeRequest | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadChangeRequests()
  }, [])

  const loadChangeRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/time-change-requests?status=PENDING')
      if (response.ok) {
        const data = await response.json()
        setChangeRequests(data)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load change requests',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading change requests:', error)
      toast({
        title: 'Error',
        description: 'Failed to load change requests',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    if (!confirm('Are you sure you want to approve this change request? The timesheet will be updated immediately.')) {
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/time-change-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED'
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Change request approved successfully'
        })
        loadChangeRequests()
        setIsDetailOpen(false)
        setSelectedRequest(null)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve change request')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve change request',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

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
      const response = await fetch(`/api/time-change-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectionReason
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Change request rejected successfully'
        })
        loadChangeRequests()
        setIsRejectOpen(false)
        setIsDetailOpen(false)
        setSelectedRequest(null)
        setRejectionReason('')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject change request')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject change request',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (timeString: string) => {
    return format(new Date(timeString), 'h:mm a')
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Attendance Change Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {changeRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No pending attendance change requests</p>
              <p className="text-sm">All attendance change requests have been processed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Original Time</TableHead>
                  <TableHead>Requested Time</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{request.user.name || request.user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(request.date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>In: {formatTime(request.originalClockInTime)}</div>
                        {request.originalClockOutTime && (
                          <div>Out: {formatTime(request.originalClockOutTime)}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-blue-600">
                        <div>In: {formatTime(request.requestedClockInTime)}</div>
                        {request.requestedClockOutTime && (
                          <div>Out: {formatTime(request.requestedClockOutTime)}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {format(new Date(request.submittedAt), 'MMM d, h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request)
                            setIsDetailOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attendance Change Request Details</DialogTitle>
            <DialogDescription>
              Review the attendance change request and approve or reject it.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee</Label>
                  <div className="text-sm font-medium">
                    {selectedRequest.user.name || selectedRequest.user.email}
                  </div>
                </div>
                <div>
                  <Label>Date</Label>
                  <div className="text-sm font-medium">
                    {formatDate(selectedRequest.date)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-600">Original Time</Label>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">Clock In:</span>{' '}
                      {formatTime(selectedRequest.originalClockInTime)}
                    </div>
                    {selectedRequest.originalClockOutTime && (
                      <div className="text-sm">
                        <span className="font-medium">Clock Out:</span>{' '}
                        {formatTime(selectedRequest.originalClockOutTime)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <Label className="text-blue-600">Requested Time</Label>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm font-medium text-blue-700">
                      <span className="font-medium">Clock In:</span>{' '}
                      {formatTime(selectedRequest.requestedClockInTime)}
                    </div>
                    {selectedRequest.requestedClockOutTime && (
                      <div className="text-sm font-medium text-blue-700">
                        <span className="font-medium">Clock Out:</span>{' '}
                        {formatTime(selectedRequest.requestedClockOutTime)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Reason for Change</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                  {selectedRequest.reason}
                </div>
              </div>
              
              {selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-sm font-semibold text-red-900 mb-2 block">Rejection Reason:</Label>
                  <p className="text-sm text-red-800">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              <div>
                <Label>Submitted</Label>
                <div className="text-sm text-gray-500">
                  {format(new Date(selectedRequest.submittedAt), 'MMMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectOpen(true)
              }}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedRequest && handleApprove(selectedRequest.id)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Attendance Change Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this attendance change request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this change request is being rejected..."
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectOpen(false)
                setRejectionReason('')
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessing ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

