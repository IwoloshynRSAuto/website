'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Plus, FileText, DollarSign, Package } from 'lucide-react'
import { CreateBOMDialog } from './create-bom-dialog'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface BOM {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  totalParts: number
  totalCost: number
  totalCustomerPrice: number
}

export function BOMList() {
  const [boms, setBOMs] = useState<BOM[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchBOMs()
  }, [])

  const fetchBOMs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/boms')
      if (response.ok) {
        const data = await response.json()
        setBOMs(data.boms || [])
      }
    } catch (error) {
      console.error('Error fetching BOMs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBOMCreated = () => {
    setIsCreateDialogOpen(false)
    fetchBOMs()
  }

  const handleBOMClick = (bomId: string) => {
    router.push(`/dashboard/parts/boms/${bomId}`)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bills of Materials</h2>
          <p className="text-sm text-gray-600">Create and manage bills of materials</p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New BOM
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Total Parts</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Customer Price</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Loading BOMs...
                    </TableCell>
                  </TableRow>
                ) : boms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No BOMs found. Create your first BOM to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  boms.map((bom) => (
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

      <CreateBOMDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onBOMCreated={handleBOMCreated}
      />
    </>
  )
}

