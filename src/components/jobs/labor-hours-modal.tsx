'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface TimeEntry {
  id: string
  date: string
  regularHours: number
  overtimeHours: number
  notes: string | null
  billable: boolean
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  } | null
  laborCode: {
    id: string
    code: string
    name: string
  } | null
  submission: {
    id: string
    status: string
    submittedAt: string | null
    approvedAt: string | null
  } | null
}

interface LaborHoursModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  laborCodeId: string
}

export function LaborHoursModal({
  isOpen,
  onClose,
  jobId,
  laborCodeId,
}: LaborHoursModalProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'filtered' | 'all'>('filtered')
  const [exporting, setExporting] = useState(false)
  const [jobNumber, setJobNumber] = useState<string>('')
  const [laborCode, setLaborCode] = useState<{code: string, name: string} | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadTimeEntries()
    }
  }, [isOpen, jobId, laborCodeId])

  const loadTimeEntries = async () => {
    setLoading(true)
    try {
      const url = `/api/jobs/${jobId}/time-entries?laborCodeId=${laborCodeId}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setTimeEntries(data.timeEntries || [])
        // Get job number and labor code from first entry
        if (data.timeEntries && data.timeEntries.length > 0) {
          const firstEntry = data.timeEntries[0]
          if (firstEntry.laborCode) {
            setLaborCode({
              code: firstEntry.laborCode.code,
              name: firstEntry.laborCode.name
            })
          }
        }
        // Fetch job details for job number
        const jobResponse = await fetch(`/api/jobs/${jobId}`)
        const jobData = await jobResponse.json()
        if (jobData.success) {
          setJobNumber(jobData.job.jobNumber)
        }
      }
    } catch (error) {
      console.error('Error loading time entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (filterByLaborCode: boolean) => {
    setExporting(true)
    try {
      const url = filterByLaborCode
        ? `/api/jobs/${jobId}/time-entries/export?laborCodeId=${laborCodeId}`
        : `/api/jobs/${jobId}/time-entries/export`
      
      const response = await fetch(url)
      const blob = await response.blob()
      
      const filename = filterByLaborCode && laborCode
        ? `job_${jobNumber}_labor_${laborCode.code}.xlsx`
        : `job_${jobNumber}_all_hours.xlsx`
      
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = filename
      link.click()
    } catch (error) {
      console.error('Error exporting:', error)
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-200 text-gray-800',
      SUBMITTED: 'bg-blue-200 text-blue-800',
      APPROVED: 'bg-green-200 text-green-800',
      REJECTED: 'bg-red-200 text-red-800',
    }
    return (
      <Badge className={statusColors[status] || 'bg-gray-200 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  const filteredEntries = activeTab === 'filtered'
    ? timeEntries.filter(entry => entry.laborCode?.id === laborCodeId)
    : timeEntries

  const totalHours = filteredEntries.reduce(
    (sum, entry) => sum + entry.regularHours + entry.overtimeHours,
    0
  )

  const renderTable = (entries: TimeEntry[]) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <span className="text-lg font-semibold">
            Total Hours: {totalHours.toFixed(2)}
          </span>
        </div>
        <Button
          onClick={() => handleExport(activeTab === 'filtered')}
          disabled={exporting}
          variant="outline"
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Labor Code</TableHead>
              <TableHead>Date Worked</TableHead>
              <TableHead>Regular Hours</TableHead>
              <TableHead>OT Hours</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No time entries found
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.user?.name || entry.user?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {entry.laborCode ? (
                      <div>
                        <div className="font-medium">{entry.laborCode.code}</div>
                        <div className="text-xs text-gray-500">{entry.laborCode.name}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{entry.regularHours.toFixed(2)}</TableCell>
                  <TableCell>{entry.overtimeHours.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">
                    {(entry.regularHours + entry.overtimeHours).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {entry.submission?.submittedAt
                      ? format(new Date(entry.submission.submittedAt), 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {entry.submission
                      ? getStatusBadge(entry.submission.status)
                      : getStatusBadge('DRAFT')}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.notes || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {laborCode
              ? `Labor Code: ${laborCode.code} - ${laborCode.name}`
              : `All Hours for Job ${jobNumber}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : laborCode ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'filtered' | 'all')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="filtered">
                This Labor Code Only
              </TabsTrigger>
              <TabsTrigger value="all">
                All Hours for Job
              </TabsTrigger>
            </TabsList>

            <TabsContent value="filtered" className="mt-4">
              {renderTable(filteredEntries)}
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              {renderTable(timeEntries)}
            </TabsContent>
          </Tabs>
        ) : (
          renderTable(timeEntries)
        )}
      </DialogContent>
    </Dialog>
  )
}

