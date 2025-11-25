'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addWeeks, subWeeks, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, X, ArrowUpDown, FileText, MapPin, AlertCircle, Calendar as CalendarLucide, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { getWeekBoundariesUTC } from '@/lib/utils/date-utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GeolocationView } from './geolocation-view'
import { TimeChangeApprovals } from './time-change-approvals'
import { PTOApprovalsPage } from '@/components/approvals/pto-approvals-page'
import { ExpenseApprovalsPage } from '@/components/approvals/expense-approvals-page'

interface EmployeeSubmission {
    id: string
    name: string
    email: string | null
    timeStatus: string
    timeSubmissionId: string | null
    attendanceStatus: string
    attendanceSubmissionId: string | null
    metrics?: {
        regularHours: number
        overtimeHours: number
        totalHours: number
    }
}

export function WeeklyApprovalsView() {
    const { toast } = useToast()
    const [currentDate, setCurrentDate] = useState<Date | null>(null)
    const [employees, setEmployees] = useState<EmployeeSubmission[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'status', direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' })

    useEffect(() => {
        setCurrentDate(startOfDay(new Date()))
    }, [])

    const fetchData = useCallback(async () => {
        if (!currentDate) return

        const { weekStart } = getWeekBoundariesUTC(currentDate)

        setIsLoading(true)
        try {
            const response = await fetch(`/api/approvals/timesheets?weekStart=${weekStart.toISOString()}`)
            if (!response.ok) throw new Error('Failed to fetch data')
            const result = await response.json()
            if (result.success) {
                setEmployees(result.data)
            }
        } catch (error) {
            console.error(error)
            toast({ title: 'Error', description: 'Failed to load approvals', variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }, [currentDate, toast])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (!currentDate) return null

    const { weekStart, weekEnd } = getWeekBoundariesUTC(currentDate)

    const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        // Optimistic update
        setEmployees(prev => prev.map(emp => {
            if (emp.timeSubmissionId === id) return { ...emp, timeStatus: status }
            if (emp.attendanceSubmissionId === id) return { ...emp, attendanceStatus: status }
            return emp
        }))

        try {
            const response = await fetch(`/api/timesheet-submissions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, rejectionReason: status === 'REJECTED' ? 'Rejected by admin' : undefined })
            })

            if (!response.ok) throw new Error('Failed to update status')

            toast({ title: 'Success', description: `Submission ${status.toLowerCase()}` })
            fetchData() // Sync with server
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
            fetchData() // Revert
        }
    }

    const sortedEmployees = [...employees].sort((a, b) => {
        if (sortConfig.key === 'name') {
            return sortConfig.direction === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name)
        } else {
            // Sort by status priority: Not Submitted -> Pending -> Approved -> Rejected
            const statusPriority = { 'NOT_SUBMITTED': 0, 'SUBMITTED': 1, 'APPROVED': 2, 'REJECTED': 3, 'DRAFT': 0 }
            // Use Time status as primary for sorting, then Attendance
            const statusA = Math.max(statusPriority[a.timeStatus as keyof typeof statusPriority] || 0, statusPriority[a.attendanceStatus as keyof typeof statusPriority] || 0)
            const statusB = Math.max(statusPriority[b.timeStatus as keyof typeof statusPriority] || 0, statusPriority[b.attendanceStatus as keyof typeof statusPriority] || 0)
            return sortConfig.direction === 'asc' ? statusA - statusB : statusB - statusA
        }
    })

    const toggleSort = (key: 'name' | 'status') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>
            case 'REJECTED': return <Badge className="bg-red-500 hover:bg-red-600">Rejected</Badge>
            case 'SUBMITTED': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
            default: return <Badge variant="outline" className="text-gray-400">Not Submitted</Badge>
        }
    }

    return (
        <Tabs defaultValue="approvals" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6 gap-2 bg-transparent p-0 h-auto max-w-[1000px]">
                <TabsTrigger
                    value="approvals"
                    className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 active:bg-orange-100 font-bold text-gray-800 hover:text-orange-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600"
                >
                    <FileText className="h-4 w-4" />
                    Approvals
                </TabsTrigger>
                <TabsTrigger
                    value="change-requests"
                    className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 active:bg-orange-100 font-bold text-gray-800 hover:text-orange-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600"
                >
                    <AlertCircle className="h-4 w-4" />
                    Change Requests
                </TabsTrigger>
                <TabsTrigger
                    value="pto-approvals"
                    className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 active:bg-orange-100 font-bold text-gray-800 hover:text-orange-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600"
                >
                    <CalendarLucide className="h-4 w-4" />
                    PTO Approvals
                </TabsTrigger>
                <TabsTrigger
                    value="expense-approvals"
                    className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 active:bg-orange-100 font-bold text-gray-800 hover:text-orange-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600"
                >
                    <DollarSign className="h-4 w-4" />
                    Expense Approvals
                </TabsTrigger>
                <TabsTrigger
                    value="geolocation"
                    className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 active:bg-orange-100 font-bold text-gray-800 hover:text-orange-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600"
                >
                    <MapPin className="h-4 w-4" />
                    Geolocation
                </TabsTrigger>
            </TabsList>

            <TabsContent value="approvals" className="space-y-6 mt-0">
                {/* Week Selector */}
                <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate!, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-lg font-semibold">
                            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate!, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    Select Week
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={currentDate || undefined} onSelect={(date) => date && setCurrentDate(date)} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Employee List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Employee Submissions</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => toggleSort('name')}>
                                    Sort by Name <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => toggleSort('status')}>
                                    Sort by Status <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-center py-8">Loading...</div>
                            ) : (
                                <div className="border rounded-md">
                                    <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 font-medium border-b text-sm">
                                        <div className="col-span-3">Employee</div>
                                        <div className="col-span-2 text-right">Regular</div>
                                        <div className="col-span-2 text-right">Overtime</div>
                                        <div className="col-span-3">Time Status</div>
                                        <div className="col-span-2">Attendance Status</div>
                                    </div>
                                    {sortedEmployees.map((emp) => (
                                        <div key={emp.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center hover:bg-gray-50 text-sm">
                                            <div className="col-span-3 font-medium truncate" title={emp.name}>{emp.name}</div>
                                            <div className="col-span-2 text-right font-mono text-gray-600">
                                                {emp.metrics?.regularHours.toFixed(2) || '0.00'}
                                            </div>
                                            <div className="col-span-2 text-right font-mono text-gray-600">
                                                {emp.metrics?.overtimeHours.toFixed(2) || '0.00'}
                                            </div>

                                            {/* Time Status */}
                                            <div className="col-span-3 flex items-center gap-2">
                                                {getStatusBadge(emp.timeStatus)}
                                                {emp.timeStatus === 'SUBMITTED' && emp.timeSubmissionId && (
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusUpdate(emp.timeSubmissionId!, 'APPROVED')}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusUpdate(emp.timeSubmissionId!, 'REJECTED')}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Attendance Status */}
                                            <div className="col-span-2 flex items-center gap-2">
                                                {getStatusBadge(emp.attendanceStatus)}
                                                {emp.attendanceStatus === 'SUBMITTED' && emp.attendanceSubmissionId && (
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusUpdate(emp.attendanceSubmissionId!, 'APPROVED')}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusUpdate(emp.attendanceSubmissionId!, 'REJECTED')}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {sortedEmployees.length === 0 && (
                                        <div className="p-8 text-center text-gray-500">No employees found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="change-requests" className="mt-0">
                <TimeChangeApprovals compact={false} />
            </TabsContent>

            <TabsContent value="pto-approvals" className="mt-0">
                <PTOApprovalsPage />
            </TabsContent>

            <TabsContent value="expense-approvals" className="mt-0">
                <ExpenseApprovalsPage />
            </TabsContent>

            <TabsContent value="geolocation" className="mt-0">
                <GeolocationView />
            </TabsContent>
        </Tabs>
    )
}
