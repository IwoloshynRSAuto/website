import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { VendorDetail } from '@/components/vendors/vendor-detail'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VendorDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const { id } = await params

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          purchaseOrders: true,
          partPrices: true,
        },
      },
    },
  })

  if (!vendor) {
    notFound()
  }

  // Fetch purchase orders
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { vendorId: id },
    include: {
      job: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
        },
      },
      items: {
        include: {
          part: {
            select: {
              id: true,
              partNumber: true,
              manufacturer: true,
            },
          },
        },
      },
    },
    orderBy: { orderDate: 'desc' },
    take: 10,
  })

  // Fetch part prices
  const partPrices = await prisma.vendorPartPrice.findMany({
    where: { vendorId: id },
    include: {
      part: {
        select: {
          id: true,
          partNumber: true,
          manufacturer: true,
          description: true,
        },
      },
    },
    orderBy: { effectiveDate: 'desc' },
    take: 50,
  })

  const vendorData = {
    id: vendor.id,
    name: vendor.name,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    website: vendor.website,
    category: vendor.category,
    notes: vendor.notes,
    isActive: vendor.isActive,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
    purchaseOrderCount: vendor._count.purchaseOrders,
    partPriceCount: vendor._count.partPrices,
  }

  return (
    <VendorDetail
      vendor={vendorData}
      initialPurchaseOrders={purchaseOrders.map(po => ({
        id: po.id,
        poNumber: po.poNumber,
        status: po.status,
        orderDate: po.orderDate.toISOString(),
        expectedDate: po.expectedDate?.toISOString() || null,
        receivedDate: po.receivedDate?.toISOString() || null,
        totalAmount: po.totalAmount || 0,
        jobNumber: po.job?.jobNumber || null,
        jobTitle: po.job?.title || null,
        itemCount: po.items.length,
      }))}
      initialPartPrices={partPrices.map(pp => ({
        id: pp.id,
        partId: pp.partId,
        partNumber: pp.part.partNumber,
        manufacturer: pp.part.manufacturer,
        description: pp.part.description,
        price: pp.price,
        leadTimeDays: pp.leadTimeDays,
        minimumOrderQuantity: pp.minimumOrderQuantity,
        effectiveDate: pp.effectiveDate.toISOString(),
        notes: pp.notes,
      }))}
    />
  )
}

