'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, FileText, DollarSign, Package } from 'lucide-react'
import { format } from 'date-fns'
import { CreateBOMDialog } from './create-bom-dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BOMData {
  id: string
  name: string
  status?: 'DRAFT' | 'QUOTE' | 'ASSEMBLY'
  createdAt: string
  updatedAt: string
  totalParts: number
  totalCost: number
  totalCustomerPrice: number
}

interface AssembliesListViewProps {
  initialBOMs: BOMData[]
}

export function AssembliesListView({ initialBOMs }: AssembliesListViewProps) {
  const router = useRouter()
  const [boms, setBOMs] = useState<BOMData[]>(initialBOMs)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

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
        const bomsWithTotals = data.boms || []
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
    router.push(`/dashboard/parts/assemblies/${bomId}`)
  }

  return (
    <>
      <DashboardPageContainer>
        <DashboardHeader
          title="Assemblies (BOMs)"
          subtitle="Bills of Materials with quantities, pricing, and markups"
        >
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
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
              <TabsTrigger value="QUOTE">Quotes</TabsTrigger>
              <TabsTrigger value="ASSEMBLY">Assemblies</TabsTrigger>
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
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleBOMClick(bom.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              {bom.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            {bom.status === 'DRAFT' && (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                            {bom.status === 'QUOTE' && (
                              <Badge variant="outline" className="border-green-600 text-green-700">Quote</Badge>
                            )}
                            {bom.status === 'ASSEMBLY' && (
                              <Badge variant="outline" className="border-purple-600 text-purple-700">Assembly</Badge>
                            )}
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

