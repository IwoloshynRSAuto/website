'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { DollarSign, CheckCircle, XCircle, User, Briefcase } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

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

export function ExpenseApprovalsPage() {
  const { toast } = useToast()
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    loadExpenseReports()
  }, [])

  const loadExpenseReports = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/approvals')
      if (!response.ok) throw new Error('Failed to load expense reports')
      const data = await response.json()
      setExpenseReports(data.expenseReports || [])
    } catch (error) {
      console.error('Error loading expense reports:', error)
      toast({
        title: 'Error',
        description: 'Failed to load expense reports',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/approvals/expense/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })

      if (!response.ok) throw new Error('Failed to approve report')
      
      toast({
        title: 'Success',
        description: 'Expense report approved',
      })
      loadExpenseReports()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve report',
        variant: 'destructive',
      })
    }
  }

  const handleReject = async () => {
    if (!selectedReport) return
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch(`/api/approvals/expense/${selectedReport}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'REJECTED',
          rejectionReason: rejectionReason,
        }),
      })

      if (!response.ok) throw new Error('Failed to reject report')
      
      toast({
        title: 'Success',
        description: 'Expense report rejected',
      })
      setSelectedReport(null)
      setRejectionReason('')
      loadExpenseReports()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject report',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading expense reports...</div>
  }

  if (expenseReports.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No pending expense reports</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {expenseReports.map((report) => (
        <Card key={report.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-semibold">{report.user.name || report.user.email}</div>
                    <div className="text-sm text-gray-600">{report.user.email}</div>
                  </div>
                  <Badge variant="outline">{report.category}</Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Description: </span>
                    {report.description}
                  </div>
                  <div>
                    <span className="font-medium">Amount: </span>
                    ${report.amount.toFixed(2)}
                  </div>
                  {report.job && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Job: </span>
                      {report.job.jobNumber} - {report.job.title}
                    </div>
                  )}
                  <div className="text-gray-500">
                    Date: {format(new Date(report.reportDate), 'MMM d, yyyy')}
                    {report.submittedAt && (
                      <> • Submitted: {format(new Date(report.submittedAt), 'MMM d, yyyy h:mm a')}</>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => handleApprove(report.id)}
                  variant="default"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => setSelectedReport(report.id)}
                  variant="destructive"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>

            {selectedReport === report.id && (
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
                      setSelectedReport(null)
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

