'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, Box, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { CreatePackageDialog } from './create-package-dialog'

interface PackageData {
  id: string
  name: string
  type: string
  description: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  totalParts: number
  parts: Array<{
    id: string
    partNumber: string
    manufacturer: string
    description: string | null
  }>
}

interface PackagesListViewProps {
  initialPackages: PackageData[]
}

export function PackagesListView({ initialPackages }: PackagesListViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [packages, setPackages] = useState<PackageData[]>(initialPackages)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  // Clear form data from localStorage when navigating away from packages page
  const isOnPackagesPage = useRef(pathname === '/dashboard/parts/packages')
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const currentPath = pathname
    const wasOnPackagesPage = isOnPackagesPage.current
    const isNowOnPackagesPage = currentPath === '/dashboard/parts/packages'
    
    // If pathname changed AND we're leaving the packages page, clear immediately
    if (wasOnPackagesPage && !isNowOnPackagesPage) {
      try {
        localStorage.removeItem('create-package-dialog-form')
        console.log('[PackagesListView] ✅ Cleared form data - navigated away from packages page')
      } catch (e) {
        console.error('[PackagesListView] ❌ Error clearing form data:', e)
      }
    }
    
    isOnPackagesPage.current = isNowOnPackagesPage
  }, [pathname])
  
  // Also clear on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        const currentUrl = window.location.pathname
        const leavingPackagesPage = currentUrl !== '/dashboard/parts/packages'
        
        if (leavingPackagesPage) {
          try {
            localStorage.removeItem('create-package-dialog-form')
          } catch (e) {
            console.error('[PackagesListView] ❌ Error clearing form data on unmount:', e)
          }
        }
      }
    }
  }, [])

  useEffect(() => {
    setPackages(initialPackages)
  }, [initialPackages])

  const handlePackageCreated = async () => {
    setIsCreateDialogOpen(false)
    // Refresh packages from server
    router.refresh()
    // Also fetch directly for immediate update
    try {
      const response = await fetch('/api/packages')
      if (response.ok) {
        const data = await response.json()
        const packagesWithType = (data.packages || []).map((pkg: any) => ({
          ...pkg,
          type: pkg.type || 'Package',
          createdAt: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: pkg.updatedAt ? new Date(pkg.updatedAt).toISOString() : new Date().toISOString(),
        }))
        setPackages(packagesWithType)
      }
    } catch (err) {
      console.error('Error fetching packages:', err)
    }
  }

  const handlePackageClick = (packageId: string) => {
    router.push(`/dashboard/parts/packages/${packageId}`)
  }

  const filteredPackages = packages.filter(pkg => {
    if (typeFilter === 'all') return true
    return pkg.type === typeFilter
  })

  return (
    <>
      <DashboardPageContainer>
        <DashboardHeader
          title="Packages / Assemblies"
          subtitle="Manage reusable part groups and finalized assemblies"
        >
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
            type="button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Package
          </Button>
        </DashboardHeader>

        <DashboardContent>
          {/* Filter Bar */}
          <div className="mb-4 p-4 bg-white border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label htmlFor="type-filter" className="text-sm font-medium text-gray-700">Type:</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter" className="h-9 w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Package">Package</SelectItem>
                    <SelectItem value="Assembly">Assembly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center"># of Parts</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPackages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          {packages.length === 0 
                            ? 'No packages found. Create your first package to get started.'
                            : `No ${typeFilter === 'all' ? '' : typeFilter.toLowerCase()}s found.`
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPackages.map((pkg) => (
                        <TableRow
                          key={pkg.id}
                          className="cursor-pointer hover:bg-purple-50 transition-colors duration-150"
                          onClick={() => handlePackageClick(pkg.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {pkg.type === 'Assembly' ? (
                                <Box className="h-4 w-4 text-purple-600" />
                              ) : (
                                <Package className="h-4 w-4 text-blue-600" />
                              )}
                              {pkg.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={pkg.type === 'Assembly' ? 'default' : 'secondary'}>
                              {pkg.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {pkg.totalParts}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {pkg.description || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {format(new Date(pkg.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </DashboardContent>
      </DashboardPageContainer>

      <CreatePackageDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onPackageCreated={handlePackageCreated}
      />
    </>
  )
}

