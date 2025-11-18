'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  User,
  Briefcase,
  FileText,
  Filter,
} from 'lucide-react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

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
  approvedAt: string | null
  approvedById: string | null
  rejectedAt: string | null
  rejectedById: string | null
  rejectionReason: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
  approvedBy?: {
    id: string
    name: string | null
  } | null
  rejectedBy?: {
    id: string
    name: string | null
  } | null
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
  approvedAt: string | null
  approvedById: string | null
  rejectedAt: string | null
  rejectedById: string | null
  rejectionReason: string | null
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
  receiptFile?: {
    id: string
    fileName: string
    fileUrl: string | null
    storagePath: string
  } | null
  approvedBy?: {
    id: string
    name: string | null
  } | null
  rejectedBy?: {
    id: string
    name: string | null
  } | null
}


export function AdminApprovalsView() {
  const { toast } = useToast()
  const [summary, setSummary] = useState<ApprovalSummary | null>(null)
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<{
    type: 'pto' | 'expense'
    id: string
  } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [activeTab, setActiveTab] = useState<'pto' | 'expense'>('pto')

  useEffect(() => {
    loadApprovals()
  }, [statusFilter])

  const loadApprovals = async () => {
    try {
      setIsLoading(true)
      console.log('[AdminApprovalsView] Loading approvals with filter:', statusFilter)
      const response = await fetch('/api/approvals')
      if (!response.ok) throw new Error('Failed to load approvals')
      const data = await response.json()
      setSummary(data.summary)
      
      // Filter based on status
      let filteredTimeOff = data.timeOffRequests || []
      let filteredExpenses = data.expenseReports || []

      if (statusFilter === 'pending') {
        filteredTimeOff = filteredTimeOff.filter((r: TimeOffRequest) => r.status === 'PENDING')
        filteredExpenses = filteredExpenses.filter((r: ExpenseReport) => r.status === 'SUBMITTED')
      } else if (statusFilter === 'approved') {
        filteredTimeOff = filteredTimeOff.filter((r: TimeOffRequest) => r.status === 'APPROVED')
        filteredExpenses = filteredExpenses.filter((r: ExpenseReport) => r.status === 'APPROVED')
      } else if (statusFilter === 'rejected') {
        filteredTimeOff = filteredTimeOff.filter((r: TimeOffRequest) => r.status === 'REJECTED')
        filteredExpenses = filteredExpenses.filter((r: ExpenseReport) => r.status === 'REJECTED')
      }

      setTimeOffRequests(filteredTimeOff)
      setExpenseReports(filteredExpenses)
    } catch (error) {
      console.error('[AdminApprovalsView] Error loading approvals:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pending approvals',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (type: 'pto' | 'expense', id: string) => {
    try {
      const endpoint = type === 'pto'
        ? `/api/approvals/time-off/${id}`
        : `/api/approvals/expense/${id}`

      console.log('[AdminApprovalsView] Approving:', { type, id, endpoint })

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('[AdminApprovalsView] Approval failed:', data)
        throw new Error(data.error || 'Failed to approve request')
      }

      console.log('[AdminApprovalsView] Approval successful:', data)

      toast({
        title: 'Success',
        description: 'Request approved successfully',
      })

      setSelectedRequest(null)
      loadApprovals()
    } catch (error: any) {
      console.error('[AdminApprovalsView] Error approving:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      })
    }
  }

  const handleReject = async (type: 'pto' | 'expense', id: string) => {
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
        : `/api/approvals/expense/${id}`

      console.log('[AdminApprovalsView] Rejecting:', { type, id, endpoint, rejectionReason })

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('[AdminApprovalsView] Rejection failed:', data)
        throw new Error(data.error || 'Failed to reject request')
      }

      console.log('[AdminApprovalsView] Rejection successful:', data)

      toast({
        title: 'Success',
        description: 'Request rejected successfully',
      })

      setSelectedRequest(null)
      setRejectionReason('')
      loadApprovals()
    } catch (error: any) {
      console.error('[AdminApprovalsView] Error rejecting:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'SUBMITTED':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">Pending</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const openReceipt = async (receiptFile: { fileUrl: string | null; storagePath: string; fileName: string }) => {
    if (receiptFile.fileUrl) {
      window.open(receiptFile.fileUrl, '_blank')
    } else if (receiptFile.storagePath) {
      // Try to open via storage API
      try {
        const path = encodeURIComponent(receiptFile.storagePath)
        window.open(`/api/storage/files/${path}`, '_blank')
      } catch (error) {
        console.error('Error opening receipt:', error)
        toast({
          title: 'Error',
          description: 'Could not open receipt file',
          variant: 'destructive',
        })
      }
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
      {/* Summary Cards */}
      {summary && (summary.timeOffCount > 0 || summary.expenseCount > 0) && statusFilter === 'pending' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Pending PTO</div>
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold">{summary.timeOffCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Pending Expenses</div>
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold">{summary.expenseCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className={statusFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('pending')}
          className={statusFilter === 'pending' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
        >
          Pending
        </Button>
        <Button
          variant={statusFilter === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('approved')}
          className={statusFilter === 'approved' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
        >
          Approved
        </Button>
        <Button
          variant={statusFilter === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('rejected')}
          className={statusFilter === 'rejected' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
        >
          Rejected
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pto' | 'expense')}>
        <TabsList className="grid w-full grid-cols-2 mb-6 gap-2 bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="pto" 
            className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 font-bold text-gray-800 hover:text-blue-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600"
          >
            <Calendar className="h-5 w-5" />
            Time Off ({timeOffRequests.length})
          </TabsTrigger>
          <TabsTrigger 
            value="expense" 
            className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 font-bold text-gray-800 hover:text-blue-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600"
          >
            <DollarSign className="h-5 w-5" />
            Expenses ({expenseReports.length})
          </TabsTrigger>
        </TabsList>

        {/* PTO Tab */}
        <TabsContent value="pto" className="space-y-4 mt-0">
          {timeOffRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No time off requests found</p>
              </CardContent>
            </Card>
          ) : (
            timeOffRequests.map((request) => (
              <Card key={request.id} className="border-2 border-gray-200 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-bold text-lg text-gray-900">
                            {request.user.name || request.user.email}
                          </div>
                          <div className="text-sm text-gray-600">{request.user.email}</div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Date Range:</span>
                          <div className="text-gray-900">
                            {format(new Date(request.startDate), 'MMM d, yyyy')} -{' '}
                            {format(new Date(request.endDate), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Type:</span>
                          <div className="text-gray-900">{request.requestType}</div>
                        </div>
                        {request.hours && (
                          <div>
                            <span className="font-medium text-gray-700">Hours:</span>
                            <div className="text-gray-900">{request.hours}</div>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-700">Submitted:</span>
                          <div className="text-gray-900">
                            {format(new Date(request.submittedAt), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                        {request.reason && (
                          <div className="sm:col-span-2">
                            <span className="font-medium text-gray-700">Reason:</span>
                            <div className="text-gray-900 mt-1">{request.reason}</div>
                          </div>
                        )}
                        {request.rejectionReason && (
                          <div className="sm:col-span-2">
                            <span className="font-medium text-red-700">Rejection Reason:</span>
                            <div className="text-red-900 mt-1 bg-red-50 p-2 rounded">{request.rejectionReason}</div>
                          </div>
                        )}
                        {request.approvedBy && (
                          <div>
                            <span className="font-medium text-gray-700">Approved By:</span>
                            <div className="text-gray-900">{request.approvedBy.name || 'Unknown'}</div>
                          </div>
                        )}
                        {request.rejectedBy && (
                          <div>
                            <span className="font-medium text-gray-700">Rejected By:</span>
                            <div className="text-gray-900">{request.rejectedBy.name || 'Unknown'}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {request.status === 'PENDING' && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleApprove('pto', request.id)}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-6"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setSelectedRequest({ type: 'pto', id: request.id })}
                          className="font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-6"
                        >
                          <XCircle className="h-5 w-5 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Expense Tab */}
        <TabsContent value="expense" className="space-y-4 mt-0">
          {expenseReports.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No expense reports found</p>
              </CardContent>
            </Card>
          ) : (
            expenseReports.map((expense) => (
              <Card key={expense.id} className="border-2 border-gray-200 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-bold text-lg text-gray-900">
                            {expense.user.name || expense.user.email}
                          </div>
                          <div className="text-sm text-gray-600">{expense.user.email}</div>
                        </div>
                        {getStatusBadge(expense.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Description:</span>
                          <div className="text-gray-900 font-semibold">{expense.description}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Amount:</span>
                          <div className="text-gray-900 font-bold text-lg">${expense.amount.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Category:</span>
                          <div className="text-gray-900">{expense.category}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Date:</span>
                          <div className="text-gray-900">
                            {format(new Date(expense.reportDate), 'MMM d, yyyy')}
                          </div>
                        </div>
                        {expense.job && (
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-700">Job:</span>
                            <span className="text-gray-900">
                              {expense.job.jobNumber} - {expense.job.title}
                            </span>
                          </div>
                        )}
                        {expense.receiptFile && (
                          <div className="sm:col-span-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReceipt(expense.receiptFile!)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Receipt: {expense.receiptFile.fileName}
                            </Button>
                          </div>
                        )}
                        {expense.submittedAt && (
                          <div>
                            <span className="font-medium text-gray-700">Submitted:</span>
                            <div className="text-gray-900">
                              {format(new Date(expense.submittedAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        )}
                        {expense.rejectionReason && (
                          <div className="sm:col-span-2">
                            <span className="font-medium text-red-700">Rejection Reason:</span>
                            <div className="text-red-900 mt-1 bg-red-50 p-2 rounded">{expense.rejectionReason}</div>
                          </div>
                        )}
                        {expense.approvedBy && (
                          <div>
                            <span className="font-medium text-gray-700">Approved By:</span>
                            <div className="text-gray-900">{expense.approvedBy.name || 'Unknown'}</div>
                          </div>
                        )}
                        {expense.rejectedBy && (
                          <div>
                            <span className="font-medium text-gray-700">Rejected By:</span>
                            <div className="text-gray-900">{expense.rejectedBy.name || 'Unknown'}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {expense.status === 'SUBMITTED' && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleApprove('expense', expense.id)}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-6"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setSelectedRequest({ type: 'expense', id: expense.id })}
                          className="font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-6"
                        >
                          <XCircle className="h-5 w-5 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={4}
                className="mt-1.5"
                required
              />
            </div>
          </div>
          <DialogFooter>
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
              onClick={() => selectedRequest && handleReject(selectedRequest.type, selectedRequest.id)}
              disabled={!rejectionReason.trim()}
              className="font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-6"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

