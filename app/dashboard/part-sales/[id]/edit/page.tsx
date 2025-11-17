import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EditPartSaleForm } from '@/components/part-sales/edit-part-sale-form'

export const dynamic = 'force-dynamic'

export default async function EditPartSalePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = params instanceof Promise ? await params : params
  const { id } = resolvedParams

  const partSale = await prisma.quote.findUnique({
    where: { id, quoteType: 'PART_SALE' },
    include: {
      customer: true,
      linkedBOMs: {
        include: {
          parts: true,
        },
      },
    },
  })

  if (!partSale) {
    redirect('/dashboard/part-sales')
  }

  return <EditPartSaleForm partSale={partSale} />
}

