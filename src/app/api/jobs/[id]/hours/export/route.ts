import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

/**
 * GET /api/jobs/[id]/hours/export
 * Export all time entries for a job to Excel
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const resolvedParams = params instanceof Promise ? await params : params
        const { id: jobId } = resolvedParams

        // Fetch job details
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { jobNumber: true, title: true }
        })

        if (!job) {
            return NextResponse.json(
                { success: false, error: 'Job not found' },
                { status: 404 }
            )
        }

        // Fetch all time entries for this job
        const timeEntries = await prisma.timeEntry.findMany({
            where: {
                jobId: jobId
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                laborCode: {
                    select: {
                        code: true,
                        name: true
                    }
                },
                submission: {
                    select: {
                        submittedAt: true,
                        status: true
                    }
                }
            },
            orderBy: [
                { date: 'desc' },
                { user: { name: 'asc' } }
            ]
        })

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('All Labor Hours')

        // Set column headers
        worksheet.columns = [
            { header: 'Employee Name', key: 'employee', width: 25 },
            { header: 'Labor Code', key: 'laborCode', width: 15 },
            { header: 'Labor Description', key: 'laborDesc', width: 30 },
            { header: 'Hours Worked', key: 'hours', width: 15 },
            { header: 'Date Worked', key: 'dateWorked', width: 15 },
            { header: 'Date Submitted', key: 'dateSubmitted', width: 15 },
            { header: 'Notes', key: 'notes', width: 40 },
            { header: 'Approval Status', key: 'status', width: 20 }
        ]

        // Style header row
        worksheet.getRow(1).font = { bold: true }
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        }
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

        // Add data rows
        let totalHours = 0
        timeEntries.forEach((entry) => {
            const hours = (entry.regularHours || 0) + (entry.overtimeHours || 0)
            totalHours += hours

            worksheet.addRow({
                employee: entry.user?.name || entry.user?.email || 'Unknown',
                laborCode: entry.laborCode?.code || 'N/A',
                laborDesc: entry.laborCode?.name || 'N/A',
                hours: hours.toFixed(2),
                dateWorked: entry.date.toISOString().split('T')[0],
                dateSubmitted: entry.submission?.submittedAt
                    ? entry.submission.submittedAt.toISOString().split('T')[0]
                    : 'Not submitted',
                notes: entry.notes || '',
                status: entry.submission?.status || 'PENDING'
            })
        })

        // Add total row
        const totalRow = worksheet.addRow({
            employee: 'TOTAL',
            laborCode: '',
            laborDesc: '',
            hours: totalHours.toFixed(2),
            dateWorked: '',
            dateSubmitted: '',
            notes: '',
            status: ''
        })
        totalRow.font = { bold: true }
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE7E6E6' }
        }

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer()

        // Create filename
        const filename = `job_${job.jobNumber}_all_hours.xlsx`

        // Return file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error: any) {
        console.error('Error exporting all hours:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to export hours'
            },
            { status: 500 }
        )
    }
}
