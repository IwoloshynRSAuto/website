'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface TimeEntry {
    id: string
    date: string
    regularHours: number
    overtimeHours: number
    notes: string | null
    user: {
        id: string
        name: string | null
        email: string
    } | null
    laborCode?: {
        code: string
        name: string
    }
    submission: {
        id: string
        status: string
        submittedAt: string | null
    } | null
}

interface LaborCodeDrillDownModalProps {
    isOpen: boolean
    onClose: () => void
    jobId: string
    laborCodeId: string | null
    laborCodeName: string | null
    jobType: 'JOB' | 'QUOTE'
}

export function LaborCodeDrillDownModal({
    isOpen,
    onClose,
    jobId,
    laborCodeId,
    laborCodeName,
    jobType
}: LaborCodeDrillDownModalProps) {
    const [activeTab, setActiveTab] = useState<'labor-code' | 'all-job'>('labor-code')
    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isOpen && jobId) {
            fetchData()
        }
    }, [isOpen, jobId, laborCodeId, activeTab])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            let url = ''
            const apiBase = jobType === 'JOB' ? '/api/jobs' : '/api/quotes'

            if (activeTab === 'labor-code' && laborCodeId) {
                url = `${apiBase}/${jobId}/labor-codes/${laborCodeId}/hours`
            } else {
                url = `${apiBase}/${jobId}/hours`
            }

            const response = await fetch(url)
            if (response.ok) {
                const data = await response.json()
                setEntries(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching hours:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleExport = () => {
        const apiBase = jobType === 'JOB' ? '/api/jobs' : '/api/quotes'
        let url = ''

        if (activeTab === 'labor-code' && laborCodeId) {
            url = `${apiBase}/${jobId}/labor-codes/${laborCodeId}/export`
        } else {
            url = `${apiBase}/${jobId}/hours/export`
        }

        window.open(url, '_blank')
    }

    const totalHours = entries.reduce((sum, entry) => sum + (entry.regularHours || 0) + (entry.overtimeHours || 0), 0)

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
            case 'REJECTED':
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
            case 'SUBMITTED':
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Submitted</Badge>
            default:
                return <Badge variant="outline">Pending</Badge>
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {activeTab === 'labor-code' ? `Hours for ${laborCodeName}` : 'All Job Hours'}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger value="labor-code" disabled={!laborCodeId}>Labor Code Hours</TabsTrigger>
                            <TabsTrigger value="all-job">All Job Hours</TabsTrigger>
                        </TabsList>

                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export to Excel
                        </Button>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md mb-4 flex justify-between items-center">
                        <span className="font-medium text-sm text-gray-600">Total Hours:</span>
                        <span className="font-bold text-lg">{totalHours.toFixed(2)}</span>
                    </div>

                    <div className="flex-1 overflow-auto border rounded-md">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-gray-500">
                                No time entries found.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        {activeTab === 'all-job' && <TableHead>Labor Code</TableHead>}
                                        <TableHead>Date Worked</TableHead>
                                        <TableHead>Hours</TableHead>
                                        <TableHead>Date Submitted</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">
                                                {entry.user?.name || entry.user?.email || 'Unknown'}
                                            </TableCell>
                                            {activeTab === 'all-job' && (
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{entry.laborCode?.code}</span>
                                                        <span className="text-xs text-gray-500">{entry.laborCode?.name}</span>
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                {format(new Date(entry.date), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                {((entry.regularHours || 0) + (entry.overtimeHours || 0)).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                {entry.submission?.submittedAt
                                                    ? format(new Date(entry.submission.submittedAt), 'MMM d, yyyy')
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(entry.submission?.status || 'PENDING')}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={entry.notes || ''}>
                                                {entry.notes || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
