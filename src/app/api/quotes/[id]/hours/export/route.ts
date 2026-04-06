import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

/**
 * GET /api/quotes/[id]/hours/export
 * Export all labor estimates for a quote to Excel
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
        const { id: quoteId } = resolvedParams

        // Fetch quote details
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            select: { quoteNumber: true, title: true }
        })

        if (!quote) {
            return NextResponse.json(
                { success: false, error: 'Quote not found' },
                { status: 404 }
            )
        }

        // Fetch all labor estimates for this quote
        const laborEstimates = await prisma.quoteLaborEstimate.findMany({
            where: {
                quoteId: quoteId
            },
            include: {
                laborCode: {
                    select: {
                        code: true,
                        name: true,
                        category: true,
                        hourlyRate: true
                    }
                }
            },
            orderBy: {
                laborCode: {
                    code: 'asc'
                }
            }
        })

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('All Labor Estimates')

        // Set column headers
        worksheet.columns = [
            { header: 'Labor Code', key: 'laborCode', width: 15 },
            { header: 'Labor Description', key: 'laborDesc', width: 30 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Hourly Rate', key: 'rate', width: 15 },
            { header: 'Estimated Hours', key: 'hours', width: 15 },
            { header: 'Estimated Cost', key: 'cost', width: 15 }
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
        let totalCost = 0
        laborEstimates.forEach((estimate) => {
            const hours = estimate.estimatedHours || 0
            const rate = Number(estimate.laborCode?.hourlyRate || 0)
            const cost = hours * rate
            totalHours += hours
            totalCost += cost

            worksheet.addRow({
                laborCode: estimate.laborCode?.code || 'N/A',
                laborDesc: estimate.laborCode?.name || 'N/A',
                category: estimate.laborCode?.category || 'N/A',
                rate: `$${rate.toFixed(2)}`,
                hours: hours.toFixed(2),
                cost: `$${cost.toFixed(2)}`
            })
        })

        // Add total row
        const totalRow = worksheet.addRow({
            laborCode: 'TOTAL',
            laborDesc: '',
            category: '',
            rate: '',
            hours: totalHours.toFixed(2),
            cost: `$${totalCost.toFixed(2)}`
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
        const filename = `quote_${quote.quoteNumber}_all_labor.xlsx`

        // Return file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error: any) {
        console.error('Error exporting all labor estimates:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to export labor estimates'
            },
            { status: 500 }
        )
    }
}
