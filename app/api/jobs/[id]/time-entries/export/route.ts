import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    const { searchParams } = new URL(request.url)
    const laborCodeId = searchParams.get('laborCodeId')

    // Fetch job details
    const job = await prisma.job.findUnique({
      where: { id },
      select: { jobNumber: true, title: true },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const whereClause: any = {
      jobId: id,
    }

    if (laborCodeId) {
      whereClause.laborCodeId = laborCodeId
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        laborCode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            approvedAt: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Time Entries')

    // Add headers
    worksheet.columns = [
      { header: 'Employee', key: 'employee', width: 25 },
      { header: 'Labor Code', key: 'laborCode', width: 15 },
      { header: 'Labor Code Name', key: 'laborCodeName', width: 30 },
      { header: 'Date Worked', key: 'dateWorked', width: 15 },
      { header: 'Regular Hours', key: 'regularHours', width: 15 },
      { header: 'OT Hours', key: 'overtimeHours', width: 15 },
      { header: 'Total Hours', key: 'totalHours', width: 15 },
      { header: 'Date Submitted', key: 'dateSubmitted', width: 15 },
      { header: 'Approval Status', key: 'status', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 },
    ]

    // Style header row
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    }
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    // Add data rows
    timeEntries.forEach((entry) => {
      worksheet.addRow({
        employee: entry.user?.name || entry.user?.email || 'Unknown',
        laborCode: entry.laborCode?.code || '-',
        laborCodeName: entry.laborCode?.name || '-',
        dateWorked: format(new Date(entry.date), 'MM/dd/yyyy'),
        regularHours: Number(entry.regularHours),
        overtimeHours: Number(entry.overtimeHours),
        totalHours: Number(entry.regularHours) + Number(entry.overtimeHours),
        dateSubmitted: entry.submission?.submittedAt
          ? format(new Date(entry.submission.submittedAt), 'MM/dd/yyyy')
          : '-',
        status: entry.submission?.status || 'DRAFT',
        notes: entry.notes || '-',
      })
    })

    // Add total row
    const totalRow = worksheet.addRow({
      employee: 'TOTAL',
      laborCode: '',
      laborCodeName: '',
      dateWorked: '',
      regularHours: timeEntries.reduce((sum, e) => sum + Number(e.regularHours), 0),
      overtimeHours: timeEntries.reduce((sum, e) => sum + Number(e.overtimeHours), 0),
      totalHours: timeEntries.reduce(
        (sum, e) => sum + Number(e.regularHours) + Number(e.overtimeHours),
        0
      ),
      dateSubmitted: '',
      status: '',
      notes: '',
    })

    totalRow.font = { bold: true }
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="job_${job.jobNumber}_hours.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('[Time Entries Export] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export time entries',
      },
      { status: 500 }
    )
  }
}


