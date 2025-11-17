'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  Calendar,
  DollarSign,
  Clock,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Hourglass,
} from 'lucide-react'
import { format } from 'date-fns'

interface TimeOffRequest {
  id: string
  startDate: string
  endDate: string
  requestType: string
  reason: string | null
  hours: number | null
  status: string
  submittedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
}

interface ExpenseReport {
  id: string
  reportDate: string
  description: string
  amount: number
  category: string
  jobId: string | null
  status: string
  submittedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  job: {
    id: string
    jobNumber: string
    title: string
  } | null
}

interface TimeChangeRequest {
  id: string
  date: string
  originalClockInTime: string
  originalClockOutTime: string | null
  requestedClockInTime: string
  requestedClockOutTime: string | null
  reason: string
  status: string
  submittedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
}

export function EmployeeSelfService({ userId, initialTab = 'pto' }: { userId: string; initialTab?: string }) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([])
  const [timeChangeRequests, setTimeChangeRequests] = useState<TimeChangeRequest[]>([])
  const [isPtoDialogOpen, setIsPtoDialogOpen] = useState(false)
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isTimeChangeDialogOpen, setIsTimeChangeDialogOpen] = useState(false)
  const [ptoFormData, setPtoFormData] = useState({
    startDate: '',
    endDate: '',
    requestType: 'VACATION',
    reason: '',
  })
  const [expenseFormData, setExpenseFormData] = useState({
    reportDate: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'TRAVEL',
    jobId: '',
  })
  const [timeChangeFormData, setTimeChangeFormData] = useState({
    date: '',
    originalClockInTime: '',
    originalClockOutTime: '',
    requestedClockInTime: '',
    requestedClockOutTime: '',
    reason: '',
  })

  useEffect(() => {
    loadRequests()
  }, [userId])

  const loadRequests = async () => {
    try {
      // Load PTO requests
      const ptoResponse = await fetch(`/api/time-off-requests?userId=${userId}`)
      if (ptoResponse.ok) {
        const ptoData = await ptoResponse.json()
        setTimeOffRequests(ptoData.requests || [])
      }

      // Load expense reports
      const expenseResponse = await fetch(`/api/expense-reports?userId=${userId}`)
      if (expenseResponse.ok) {
        const expenseData = await expenseResponse.json()
        setExpenseReports(expenseData.expenses || [])
      }

      // Load time change requests
      const timeChangeResponse = await fetch(`/api/time-change-requests?userId=${userId}`)
      if (timeChangeResponse.ok) {
        const timeChangeData = await timeChangeResponse.json()
        setTimeChangeRequests(timeChangeData.requests || [])
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    }
  }

  const handleSubmitPTO = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/time-off-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...ptoFormData,
          startDate: new Date(ptoFormData.startDate),
          endDate: new Date(ptoFormData.endDate),
        }),
      })

      if (!response.ok) throw new Error('Failed to submit PTO request')

      toast({
        title: 'Success',
        description: 'PTO request submitted successfully',
      })

      setIsPtoDialogOpen(false)
      setPtoFormData({
        startDate: '',
        endDate: '',
        requestType: 'VACATION',
        reason: '',
      })
      loadRequests()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit PTO request',
        variant: 'destructive',
      })
    }
  }

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/expense-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...expenseFormData,
          amount: parseFloat(expenseFormData.amount),
          reportDate: new Date(expenseFormData.reportDate),
          jobId: expenseFormData.jobId || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to submit expense report')

      toast({
        title: 'Success',
        description: 'Expense report submitted successfully',
      })

      setIsExpenseDialogOpen(false)
      setExpenseFormData({
        reportDate: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: 'TRAVEL',
        jobId: '',
      })
      loadRequests()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit expense report',
        variant: 'destructive',
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Hourglass className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pto">
                <Calendar className="h-4 w-4 mr-2" />
                Time Off
              </TabsTrigger>
              <TabsTrigger value="expense">
                <DollarSign className="h-4 w-4 mr-2" />
                Expenses
              </TabsTrigger>
              <TabsTrigger value="time-change">
                <Clock className="h-4 w-4 mr-2" />
                Time Changes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pto" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Time Off Requests</h3>
                <Button onClick={() => setIsPtoDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Request Time Off
                </Button>
              </div>
              <div className="space-y-2">
                {timeOffRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            <span className="font-semibold">
                              {format(new Date(request.startDate), 'MMM d')} -{' '}
                              {format(new Date(request.endDate), 'MMM d, yyyy')}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Type: {request.requestType} | Hours: {request.hours || 'N/A'}
                          </div>
                          {request.rejectionReason && (
                            <div className="text-sm text-red-600 mt-1">
                              Reason: {request.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {timeOffRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No time off requests</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="expense" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Expense Reports</h3>
                <Button onClick={() => setIsExpenseDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Expense
                </Button>
              </div>
              <div className="space-y-2">
                {expenseReports.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(expense.status)}
                            <span className="font-semibold">{expense.description}</span>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(expense.status)}`}>
                              {expense.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            ${expense.amount.toFixed(2)} | {expense.category} |{' '}
                            {expense.job ? `Job: ${expense.job.jobNumber}` : 'No job'}
                          </div>
                          {expense.rejectionReason && (
                            <div className="text-sm text-red-600 mt-1">
                              Reason: {expense.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {expenseReports.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No expense reports</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="time-change" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Time Change Requests</h3>
                <Button onClick={() => setIsTimeChangeDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Request Time Change
                </Button>
              </div>
              <div className="space-y-2">
                {timeChangeRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            <span className="font-semibold">
                              {format(new Date(request.date), 'MMM d, yyyy')}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {format(new Date(request.originalClockInTime), 'h:mm a')} →{' '}
                            {format(new Date(request.requestedClockInTime), 'h:mm a')}
                          </div>
                          {request.rejectionReason && (
                            <div className="text-sm text-red-600 mt-1">
                              Reason: {request.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {timeChangeRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No time change requests</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* PTO Request Dialog */}
      <Dialog open={isPtoDialogOpen} onOpenChange={setIsPtoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogDescription>Submit a request for time off</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPTO}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={ptoFormData.startDate}
                    onChange={(e) => setPtoFormData({ ...ptoFormData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={ptoFormData.endDate}
                    onChange={(e) => setPtoFormData({ ...ptoFormData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="requestType">Type *</Label>
                <Select
                  value={ptoFormData.requestType}
                  onValueChange={(value) => setPtoFormData({ ...ptoFormData, requestType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACATION">Vacation</SelectItem>
                    <SelectItem value="SICK">Sick</SelectItem>
                    <SelectItem value="PERSONAL">Personal</SelectItem>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={ptoFormData.reason}
                  onChange={(e) => setPtoFormData({ ...ptoFormData, reason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPtoDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Report Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Expense Report</DialogTitle>
            <DialogDescription>Submit an expense for reimbursement</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitExpense}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="reportDate">Date *</Label>
                <Input
                  id="reportDate"
                  type="date"
                  value={expenseFormData.reportDate}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, reportDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={expenseFormData.amount}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={expenseFormData.category}
                    onValueChange={(value) => setExpenseFormData({ ...expenseFormData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRAVEL">Travel</SelectItem>
                      <SelectItem value="MEALS">Meals</SelectItem>
                      <SelectItem value="SUPPLIES">Supplies</SelectItem>
                      <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

