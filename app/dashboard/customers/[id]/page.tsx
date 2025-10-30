import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { CustomerDetailsEditable } from '@/components/admin/customer-details-editable'

interface CustomerDetailsPageProps {
  params: {
    id: string
  }
}

export default async function CustomerDetailsPage({ params }: CustomerDetailsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      jobs: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
          status: true,
          priority: true,
          startDate: true,
          endDate: true,
          estimatedCost: true,
          createdAt: true,
          updatedAt: true,
          assignedTo: {
            select: {
              name: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      },
      _count: {
        select: { jobs: true }
      }
    }
  })

  if (!customer) {
    notFound()
  }

  return (
    <div className="p-6">
      <CustomerDetailsEditable customer={customer} />
    </div>
  )
}
