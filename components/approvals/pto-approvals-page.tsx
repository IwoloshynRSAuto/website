'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, CheckCircle, XCircle, Hourglass, User } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface TimeOffRequest {
  id: string
  userId: string
  startDate: string
  endDate: string
  requestType: string
  reason: string | null
  hours: number | null
  status: string
  submittedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

export function PTOApprovalsPage() {
  const { toast } = useToast()
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    loadPTORequests()
  }, [])

  const loadPTORequests = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/approvals')
      if (!response.ok) throw new Error('Failed to load PTO requests')
      const data = await response.json()
      setTimeOffRequests(data.timeOffRequests || [])
    } catch (error) {
      console.error('Error loading PTO requests:', error)
      toast({
        title: 'Error',
        description: 'Failed to load PTO requests',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/approvals/time-off/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })

      if (!response.ok) throw new Error('Failed to approve request')
      
      toast({
        title: 'Success',
        description: 'PTO request approved',
      })
      loadPTORequests()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      })
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch(`/api/approvals/time-off/${selectedRequest}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'REJECTED',
          rejectionReason: rejectionReason,
        }),
      })

      if (!response.ok) throw new Error('Failed to reject request')
      
      toast({
        title: 'Success',
        description: 'PTO request rejected',
      })
      setSelectedRequest(null)
      setRejectionReason('')
      loadPTORequests()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading PTO requests...</div>
  }

  if (timeOffRequests.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No pending PTO requests</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {timeOffRequests.map((request) => (
        <Card key={request.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-semibold">{request.user.name || request.user.email}</div>
                    <div className="text-sm text-gray-600">{request.user.email}</div>
                  </div>
                  <Badge variant="outline">{request.requestType}</Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Dates: </span>
                    {format(new Date(request.startDate), 'MMM d, yyyy')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                  </div>
                  {request.hours && (
                    <div>
                      <span className="font-medium">Hours: </span>
                      {request.hours}
                    </div>
                  )}
                  {request.reason && (
                    <div>
                      <span className="font-medium">Reason: </span>
                      {request.reason}
                    </div>
                  )}
                  <div className="text-gray-500">
                    Submitted: {format(new Date(request.submittedAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => handleApprove(request.id)}
                  variant="default"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => setSelectedRequest(request.id)}
                  variant="destructive"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>

            {selectedRequest === request.id && (
              <div className="mt-4 pt-4 border-t">
                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="mt-2"
                  rows={3}
                />
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleReject} variant="destructive" size="sm">
                    Confirm Rejection
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedRequest(null)
                      setRejectionReason('')
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

