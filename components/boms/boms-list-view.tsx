'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, FileText, DollarSign, Package, Tag, Link as LinkIcon } from 'lucide-react'
import { format } from 'date-fns'
import { CreateBOMDialog } from '@/components/parts/create-bom-dialog'
import Link from 'next/link'

interface BOMData {
  id: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  tags: string[]
  createdAt: string
  updatedAt: string
  totalParts: number
  totalCost: number
  totalCustomerPrice: number
}

interface BOMsListViewProps {
  initialBOMs: BOMData[]
}

export function BOMsListView({ initialBOMs }: BOMsListViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [boms, setBOMs] = useState<BOMData[]>(initialBOMs)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Clear form data from localStorage when navigating away from BOMs page
  const isOnBOMsPage = useRef(pathname === '/dashboard/parts/boms')
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const currentPath = pathname
    const wasOnBOMsPage = isOnBOMsPage.current
    const isNowOnBOMsPage = currentPath === '/dashboard/parts/boms'
    
    // If pathname changed AND we're leaving the BOMs page, clear immediately
    if (wasOnBOMsPage && !isNowOnBOMsPage) {
      try {
        localStorage.removeItem('create-bom-dialog-form')
        console.log('[BOMsListView] ✅ Cleared form data - navigated away from BOMs page')
      } catch (e) {
        console.error('[BOMsListView] ❌ Error clearing form data:', e)
      }
    }
    
    isOnBOMsPage.current = isNowOnBOMsPage
  }, [pathname])
  
  // Also clear on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        const currentUrl = window.location.pathname
        const leavingBOMsPage = currentUrl !== '/dashboard/parts/boms'
        
        if (leavingBOMsPage) {
          try {
            localStorage.removeItem('create-bom-dialog-form')
          } catch (e) {
            console.error('[BOMsListView] ❌ Error clearing form data on unmount:', e)
          }
        }
      }
    }
  }, [])

  const handleBOMCreated = () => {
    setIsCreateDialogOpen(false)
    fetchBOMs()
  }

  const fetchBOMs = async (status?: string) => {
    try {
      const url = status && status !== 'all' ? `/api/boms?status=${status}` : '/api/boms'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
          const bomsWithTotals = (data.boms || []).map((bom: any) => {
          let tags: string[] = []
          try {
            if (bom.tags) {
              tags = JSON.parse(bom.tags)
            }
          } catch (e) {
            // If invalid JSON, treat as empty
          }
          return {
            ...bom,
            tags,
          }
        })
        setBOMs(bomsWithTotals)
      }
    } catch (err) {
      console.error('Error fetching BOMs:', err)
    }
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value)
    fetchBOMs(value !== 'all' ? value : undefined)
  }

  const filteredBOMs = statusFilter === 'all' 
    ? boms 
    : boms.filter(bom => bom.status === statusFilter)

  const handleBOMClick = (bomId: string) => {
    router.push(`/dashboard/parts/boms/${bomId}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>
      case 'ACTIVE':
        return <Badge variant="outline" className="border-green-600 text-green-700">Active</Badge>
      case 'ARCHIVED':
        return <Badge variant="outline" className="border-gray-600 text-gray-700">Archived</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <>
      <DashboardPageContainer>
        <DashboardHeader
          title="Bill of Materials (BOM)"
          subtitle="Compile parts and packages into working configurations"
        >
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New BOM
          </Button>
        </DashboardHeader>

        <DashboardContent>
          <Tabs value={statusFilter} onValueChange={handleFilterChange} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="DRAFT">Draft</TabsTrigger>
              <TabsTrigger value="ACTIVE">Active</TabsTrigger>
              <TabsTrigger value="ARCHIVED">Archived</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Total Parts</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Customer Price</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBOMs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No BOMs found. Create your first BOM to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBOMs.map((bom) => (
                        <TableRow
                          key={bom.id}
                          className="cursor-pointer hover:bg-purple-50 transition-colors duration-150"
                          onClick={() => handleBOMClick(bom.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              {bom.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(bom.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Package className="h-4 w-4 text-gray-400" />
                              {bom.totalParts}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${bom.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${bom.totalCustomerPrice.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {format(new Date(bom.createdAt), 'MMM d, yyyy')}
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

      <CreateBOMDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onBOMCreated={handleBOMCreated}
      />
    </>
  )
}

