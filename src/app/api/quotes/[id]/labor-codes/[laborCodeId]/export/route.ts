import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

/**
 * GET /api/quotes/[id]/labor-codes/[laborCodeId]/export
 * Export time entries for a specific labor code to Excel (for quotes)
 */
export async function GET(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{ id: string; laborCodeId: string }> | { id: string; laborCodeId: string }
    }
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
        const { id: quoteId, laborCodeId } = resolvedParams

        // Fetch quote details
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            select: { quoteNumber: true }
        })

        if (!quote) {
            return NextResponse.json(
                { success: false, error: 'Quote not found' },
                { status: 404 }
            )
        }

        // Fetch labor code details
        const laborCode = await prisma.laborCode.findUnique({
            where: { id: laborCodeId },
            select: { code: true, name: true }
        })

        if (!laborCode) {
            return NextResponse.json(
                { success: false, error: 'Labor code not found' },
                { status: 404 }
            )
        }

        // For quotes, we'll export the estimated hours from QuoteLaborEstimate
        const laborEstimate = await prisma.quoteLaborEstimate.findFirst({
            where: {
                quoteId: quoteId,
                laborCodeId: laborCodeId
            }
        })

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Labor Estimate')

        // Set column headers
        worksheet.columns = [
            { header: 'Labor Code', key: 'laborCode', width: 15 },
            { header: 'Labor Description', key: 'laborDesc', width: 30 },
            { header: 'Estimated Hours', key: 'hours', width: 15 },
            { header: 'Quote Number', key: 'quoteNumber', width: 20 }
        ]

        // Style header row
        worksheet.getRow(1).font = { bold: true }
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        }
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

        // Add data row
        worksheet.addRow({
            laborCode: laborCode.code,
            laborDesc: laborCode.name,
            hours: laborEstimate?.estimatedHours?.toFixed(2) || '0.00',
            quoteNumber: quote.quoteNumber
        })

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer()

        // Create filename
        const filename = `quote_${quote.quoteNumber}_labor_${laborCode.code}.xlsx`

        // Return file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error: any) {
        console.error('Error exporting labor estimate:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to export labor estimate'
            },
            { status: 500 }
        )
    }
}
