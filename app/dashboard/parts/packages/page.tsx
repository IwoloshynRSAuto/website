import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PackagesListView } from '@/components/parts/packages-list-view'

export const dynamic = 'force-dynamic'

export default async function PackagesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  try {
    const packages = await prisma.package.findMany({
      include: {
        parts: {
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
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const packagesData = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      type: pkg.type || 'Package',
      description: pkg.description,
      notes: pkg.notes,
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
      totalParts: pkg.parts.length,
      parts: pkg.parts.map(pp => pp.part),
    }))

    return <PackagesListView initialPackages={packagesData} />
  } catch (error: any) {
    console.error('Error loading packages:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Packages</h2>
          <p className="text-red-800">{error?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    )
  }
}

