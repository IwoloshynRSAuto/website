'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Loader2, Clock, DollarSign, Users } from 'lucide-react'

interface LaborCodeBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  laborCodeId: string
}

interface BreakdownEntry {
  id: string
  employeeName: string
  employeeEmail: string
  regularHours: number
  overtimeHours: number
  totalHours: number
  date: Date
  notes: string | null
  billable: boolean
}

interface BreakdownData {
  job: {
    id: string
    jobNumber: string
    title: string
  }
  laborCode: {
    id: string
    code: string
    name: string
    category: string
    hourlyRate: number
  }
  summary: {
    totalRegularHours: number
    totalOvertimeHours: number
    totalHours: number
    totalCost: number
    entryCount: number
  }
  breakdown: BreakdownEntry[]
}

export function LaborCodeBreakdownModal({
  isOpen,
  onClose,
  jobId,
  laborCodeId
}: LaborCodeBreakdownModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<BreakdownData | null>(null)

  useEffect(() => {
    if (isOpen && jobId && laborCodeId) {
      fetchBreakdown()
    }
  }, [isOpen, jobId, laborCodeId])

  const fetchBreakdown = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/jobs/${jobId}/labor-code-breakdown?laborCodeId=${laborCodeId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch breakdown')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching labor code breakdown:', err)
      setError('Failed to load breakdown data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Labor Code Breakdown</DialogTitle>
          <DialogDescription>
            Detailed time entry breakdown by employee
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {data && !loading && !error && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {data.laborCode.code} - {data.laborCode.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Job: {data.job.jobNumber} - {data.job.title}
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  {data.laborCode.category}
                </Badge>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600">Total Hours</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary.totalHours.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.summary.totalRegularHours.toFixed(1)} reg + {data.summary.totalOvertimeHours.toFixed(1)} OT
                </p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-600">Total Cost</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${data.summary.totalCost.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  @ ${data.laborCode.hourlyRate}/hr
                </p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-gray-600">Entries</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary.entryCount}
                </p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-600">Avg Hours/Entry</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary.entryCount > 0
                    ? (data.summary.totalHours / data.summary.entryCount).toFixed(1)
                    : '0'}
                </p>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h4 className="font-semibold text-gray-900">Time Entry Details</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Employee</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Date</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">Regular Hrs</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">OT Hrs</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">Total Hrs</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">Cost</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          No time entries found for this labor code
                        </td>
                      </tr>
                    ) : (
                      data.breakdown.map((entry) => (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm text-gray-900">
                                {entry.employeeName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {entry.employeeEmail}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {format(new Date(entry.date), 'MM/dd/yyyy')}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-900">
                            {entry.regularHours}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {entry.overtimeHours > 0 ? (
                              <span className="text-orange-600 font-medium">
                                {entry.overtimeHours}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-sm text-gray-900">
                            {entry.totalHours}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-900">
                            ${(entry.totalHours * data.laborCode.hourlyRate).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {entry.notes || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

