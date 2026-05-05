import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { QuotePlansAdminClient } from './quote-plans-admin-client'
import { RICKMASTER_ROWS } from '@/lib/quote-plans/rickmaster'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function QuotePlansAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  // Ensure a default plan exists.
  const existingCount = await prisma.quotePlan.count()
  if (existingCount === 0) {
    await prisma.quotePlan.create({
      data: {
        name: 'Default',
        description: 'Company standard quoting deliverables.',
        isActive: true,
        isDefault: true,
        items: {
          create: RICKMASTER_ROWS.map((r, idx) => ({
            taskCode: r.code,
            description: r.description,
            sortOrder: idx,
            laborCodeId: null,
          })),
        },
      },
    })
  }

  const plans = await prisma.quotePlan.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    include: { items: { orderBy: [{ sortOrder: 'asc' }, { taskCode: 'asc' }], take: 2000 } },
    take: 500,
  })

  const phases = await prisma.laborCode.findMany({
    where: { isActive: true },
    orderBy: [{ code: 'asc' }],
    select: { id: true, code: true, name: true },
    take: 5000,
  })

  return <QuotePlansAdminClient initialPlans={plans} phaseCodes={phases} />
}

