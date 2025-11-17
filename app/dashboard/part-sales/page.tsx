import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PartSaleService } from '@/lib/part-sales/service'
import { PartSalesList } from '@/components/part-sales/part-sales-list'

export const dynamic = 'force-dynamic'

export default async function PartSalesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch all part sales
  const partSales = await PartSaleService.getPartSales({})

  // Format part sales data
  const partSalesData = partSales.map((ps) => {
    const firstBOM = ps.linkedBOMs?.[0] || null
    const bomParts = firstBOM?.parts || []
    const totalCost = bomParts.reduce((sum, part) => {
      return sum + Number(part.purchasePrice) * part.quantity
    }, 0)
    const totalCustomerPrice = bomParts.reduce((sum, part) => {
      return sum + Number(part.customerPrice)
    }, 0)
    const margin = totalCustomerPrice > 0 && totalCost > 0 
      ? ((totalCustomerPrice - totalCost) / totalCustomerPrice) * 100 
      : 0
    const markup = totalCost > 0 
      ? ((totalCustomerPrice - totalCost) / totalCost) * 100 
      : 0

    return {
      id: ps.id,
      quoteNumber: ps.quoteNumber,
      title: ps.title,
      customerName: ps.customer?.name || null,
      customerId: ps.customer?.id || null,
      bomId: firstBOM?.id || null,
      bomName: firstBOM?.name || null,
      status: ps.status,
      amount: ps.amount,
      totalCost,
      totalCustomerPrice,
      margin,
      markup,
      validUntil: ps.validUntil?.toISOString() || null,
      createdAt: ps.createdAt.toISOString(),
      updatedAt: ps.updatedAt.toISOString(),
      fileCount: (ps as any)._count?.fileRecords || 0,
      revisionCount: (ps as any)._count?.revisions || 0,
    }
  })

  return <PartSalesList initialPartSales={partSalesData} />
}

