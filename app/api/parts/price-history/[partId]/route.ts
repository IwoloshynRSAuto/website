import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/parts/price-history/[partId]
 * Get price history for a specific part across all vendors
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> | { partId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { partId } = resolvedParams

    // Get price history from VendorPartPrice
    const priceHistory = await prisma.vendorPartPrice.findMany({
      where: { partId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            contactName: true,
            email: true,
            phone: true,
            website: true,
          },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    })

    // Also get purchase history from PurchaseOrderItems
    const purchaseHistory = await prisma.purchaseOrderItem.findMany({
      where: {
        partId,
        purchaseOrder: {
          status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED', 'COMPLETED'] },
        },
      },
      include: {
        purchaseOrder: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                contactName: true,
                email: true,
                phone: true,
                website: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Combine and format
    const history = [
      ...priceHistory.map((ph) => ({
        type: 'price_quote' as const,
        date: ph.effectiveDate.toISOString(),
        vendor: ph.vendor,
        price: ph.price,
        leadTimeDays: ph.leadTimeDays,
        quantity: null,
        purchaseOrderId: null,
      })),
      ...purchaseHistory.map((ph) => ({
        type: 'purchase' as const,
        date: ph.purchaseOrder.orderDate.toISOString(),
        vendor: ph.purchaseOrder.vendor,
        price: ph.unitPrice,
        leadTimeDays: ph.purchaseOrder.receivedDate && ph.purchaseOrder.orderDate
          ? Math.ceil(
              (ph.purchaseOrder.receivedDate.getTime() - ph.purchaseOrder.orderDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
        quantity: ph.quantity,
        purchaseOrderId: ph.purchaseOrderId,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      data: history,
    })
  } catch (error: any) {
    console.error('Error fetching price history:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch price history',
      },
      { status: 500 }
    )
  }
}

