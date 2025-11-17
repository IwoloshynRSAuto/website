'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Hourglass,
  User,
} from 'lucide-react'
import { format } from 'date-fns'

interface ApprovalSummary {
  totalPending: number
  timeOffCount: number
  expenseCount: number
  timeChangeCount: number
}

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

interface ExpenseReport {
  id: string
  userId: string
  reportDate: string
  description: string
  amount: number
  category: string
  jobId: string | null
  status: string
  submittedAt: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
  job: {
    id: string
    jobNumber: string
    title: string
  } | null
}

interface TimeChangeRequest {
  id: string
  userId: string
  date: string
  originalClockInTime: string
  originalClockOutTime: string | null
  requestedClockInTime: string
  requestedClockOutTime: string | null
  reason: string
  status: string
  submittedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

export function ManagerApprovalsDashboard() {
  const { toast } = useToast()
  const [summary, setSummary] = useState<ApprovalSummary | null>(null)
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([])
  const [timeChangeRequests, setTimeChangeRequests] = useState<TimeChangeRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<{
    type: 'pto' | 'expense' | 'time-change'
    id: string
  } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    loadApprovals()
  }, [])

  const loadApprovals = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/approvals')
      if (!response.ok) throw new Error('Failed to load approvals')
      const data = await response.json()
      setSummary(data.summary)
      setTimeOffRequests(data.timeOffRequests || [])
      setExpenseReports(data.expenseReports || [])
      setTimeChangeRequests(data.timeChangeRequests || [])
    } catch (error) {
      console.error('Error loading approvals:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pending approvals',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (type: 'pto' | 'expense' | 'time-change', id: string) => {
    try {
      const endpoint = type === 'pto'
        ? `/api/approvals/time-off/${id}`
        : type === 'expense'
        ? `/api/approvals/expense/${id}`
        : `/api/approvals/time-change/${id}`

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })

      if (!response.ok) throw new Error('Failed to approve request')

      toast({
        title: 'Success',
        description: 'Request approved successfully',
      })

      setSelectedRequest(null)
      loadApprovals()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      })
    }
  }

  const handleReject = async (type: 'pto' | 'expense' | 'time-change', id: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      })
      return
    }

    try {
      const endpoint = type === 'pto'
        ? `/api/approvals/time-off/${id}`
        : type === 'expense'
        ? `/api/approvals/expense/${id}`
        : `/api/approvals/time-change/${id}`

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason,
        }),
      })

      if (!response.ok) throw new Error('Failed to reject request')

      toast({
        title: 'Success',
        description: 'Request rejected successfully',
      })

      setSelectedRequest(null)
      setRejectionReason('')
      loadApprovals()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading approvals...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {summary && summary.totalPending > 0 ? (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.timeOffCount}</div>
                <div className="text-sm text-gray-600">Time Off Requests</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.expenseCount}</div>
                <div className="text-sm text-gray-600">Expense Reports</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{summary.timeChangeCount}</div>
                <div className="text-sm text-gray-600">Time Changes</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No pending approvals</div>
          )}

          <Tabs defaultValue="pto">
            <TabsList>
              <TabsTrigger value="pto">
                <Calendar className="h-4 w-4 mr-2" />
                Time Off ({timeOffRequests.length})
              </TabsTrigger>
              <TabsTrigger value="expense">
                <DollarSign className="h-4 w-4 mr-2" />
                Expenses ({expenseReports.length})
              </TabsTrigger>
              <TabsTrigger value="time-change">
                <Clock className="h-4 w-4 mr-2" />
                Time Changes ({timeChangeRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pto" className="space-y-4 mt-4">
              {timeOffRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{request.user.name || request.user.email}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>
                            {format(new Date(request.startDate), 'MMM d')} -{' '}
                            {format(new Date(request.endDate), 'MMM d, yyyy')}
                          </div>
                          <div>Type: {request.requestType} | Hours: {request.hours || 'N/A'}</div>
                          {request.reason && <div className="mt-1">Reason: {request.reason}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove('pto', request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedRequest({ type: 'pto', id: request.id })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {timeOffRequests.length === 0 && (
                <div className="text-center py-8 text-gray-500">No pending time off requests</div>
              )}
            </TabsContent>

            <TabsContent value="expense" className="space-y-4 mt-4">
              {expenseReports.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{expense.user.name || expense.user.email}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div className="font-medium">{expense.description}</div>
                          <div>
                            ${expense.amount.toFixed(2)} | {expense.category}
                            {expense.job && ` | Job: ${expense.job.jobNumber}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove('expense', expense.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedRequest({ type: 'expense', id: expense.id })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {expenseReports.length === 0 && (
                <div className="text-center py-8 text-gray-500">No pending expense reports</div>
              )}
            </TabsContent>

            <TabsContent value="time-change" className="space-y-4 mt-4">
              {timeChangeRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{request.user.name || request.user.email}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>{format(new Date(request.date), 'MMM d, yyyy')}</div>
                          <div>
                            {format(new Date(request.originalClockInTime), 'h:mm a')} →{' '}
                            {format(new Date(request.requestedClockInTime), 'h:mm a')}
                          </div>
                          <div className="mt-1">Reason: {request.reason}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove('time-change', request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedRequest({ type: 'time-change', id: request.id })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {timeChangeRequests.length === 0 && (
                <div className="text-center py-8 text-gray-500">No pending time change requests</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      {selectedRequest && (
        <Card className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <CardContent className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <h3 className="text-lg font-semibold mb-4">Reject Request</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(null)
                    setRejectionReason('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedRequest.type, selectedRequest.id)}
                  disabled={!rejectionReason.trim()}
                >
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

