'use client'

import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Database, FileText, Box, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface RecentBOM {
  id: string
  name: string
  status: string
  totalParts: number
  totalCost: number
  totalCustomerPrice: number
  updatedAt: string
}

interface PartsDashboardProps {
  partsCount: number
  packagesCount: number
  bomsCount: number
  recentBOMs: RecentBOM[]
}

export function PartsDashboard({
  partsCount,
  packagesCount,
  bomsCount,
  recentBOMs,
}: PartsDashboardProps) {
  const router = useRouter()

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="Parts Dashboard"
        subtitle="Manage parts, packages, assemblies, and BOMs"
      />

      <DashboardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Parts Database</p>
                  <p className="text-2xl font-bold text-gray-900">{partsCount}</p>
                </div>
                <Database className="h-8 w-8 text-blue-600" />
              </div>
              <Link href="/dashboard/parts/database" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                View All →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Packages / Assemblies</p>
                  <p className="text-2xl font-bold text-gray-900">{packagesCount}</p>
                </div>
                <Box className="h-8 w-8 text-green-600" />
              </div>
              <Link href="/dashboard/parts/packages" className="text-green-600 hover:underline text-sm mt-2 inline-block">
                View All →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">BOMs</p>
                  <p className="text-2xl font-bold text-gray-900">{bomsCount}</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
              <Link href="/dashboard/parts/boms" className="text-purple-600 hover:underline text-sm mt-2 inline-block">
                View All →
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/parts/database')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Browse Parts Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Search, view, and manage all individual parts in your inventory.
              </p>
              <Button variant="outline" className="w-full">
                Go to Parts Database
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/parts/packages')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5 text-green-600" />
                Packages & Assemblies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Manage reusable part groups and finalized assemblies.
              </p>
              <Button variant="outline" className="w-full">
                View Packages
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent BOMs */}
        {recentBOMs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent BOMs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentBOMs.map((bom) => (
                  <div
                    key={bom.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/parts/boms/${bom.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-900">{bom.name}</p>
                          <p className="text-sm text-gray-500">
                            {bom.totalParts} parts • ${bom.totalCustomerPrice.toFixed(2)} total
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(bom.updatedAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={() => router.push('/dashboard/parts/boms')} className="w-full">
                  View All BOMs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DashboardContent>
    </DashboardPageContainer>
  )
}

