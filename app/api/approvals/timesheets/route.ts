import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const weekStartStr = searchParams.get('weekStart')

    if (!weekStartStr) {
        return NextResponse.json({ error: 'Missing weekStart' }, { status: 400 })
    }

    const weekStart = new Date(weekStartStr)
    if (isNaN(weekStart.getTime())) {
        return NextResponse.json({ error: 'Invalid weekStart date' }, { status: 400 })
    }

    try {
        // 1. Get all active employees
        const employees = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' }
        })

        // 2. Get submissions for this week
        // Note: weekStart in DB is DateTime, we need to match it.
        // The frontend should send the exact ISO string that matches the weekStart stored in DB.
        // Usually, weekStart is stored as the start of the week (Sunday or Monday).
        // We'll assume exact match for now, or we might need a range if time components differ.

        // To be safe, let's find submissions where weekStart is within the same day.
        const startOfDay = new Date(weekStart)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(weekStart)
        endOfDay.setHours(23, 59, 59, 999)

        const submissions = await prisma.timesheetSubmission.findMany({
            where: {
                weekStart: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                user: { select: { id: true, name: true } },
                timeEntries: true
            }
        })

        // 3. Merge data
        const data = employees.map(emp => {
            const empSubmissions = submissions.filter(s => s.userId === emp.id)
            const timeSubmission = empSubmissions.find(s => s.type === 'TIME')
            const attendanceSubmission = empSubmissions.find(s => s.type === 'ATTENDANCE')

            // Calculate metrics
            let totalRegularHours = 0
            let totalOvertimeHours = 0

            if (timeSubmission && timeSubmission.timeEntries) {
                timeSubmission.timeEntries.forEach((entry: any) => {
                    totalRegularHours += entry.regularHours || 0
                    totalOvertimeHours += entry.overtimeHours || 0
                })
            }

            return {
                id: emp.id,
                name: emp.name || emp.email,
                email: emp.email,
                timeStatus: timeSubmission ? timeSubmission.status : 'NOT_SUBMITTED',
                timeSubmissionId: timeSubmission?.id,
                attendanceStatus: attendanceSubmission ? attendanceSubmission.status : 'NOT_SUBMITTED',
                attendanceSubmissionId: attendanceSubmission?.id,
                metrics: {
                    regularHours: totalRegularHours,
                    overtimeHours: totalOvertimeHours,
                    totalHours: totalRegularHours + totalOvertimeHours
                }
            }
        })

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error fetching timesheet approvals:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
