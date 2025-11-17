'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { AlertCircle, FileText, Search, DollarSign, TrendingUp, Plus, Eye, Edit } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { CreatePartSaleDialog } from './create-part-sale-dialog'

interface PartSale {
  id: string
  quoteNumber: string
  title: string
  customerName: string | null
  customerId: string | null
  bomId: string | null
  bomName: string | null
  status: string
  amount: number
  totalCost: number
  totalCustomerPrice: number
  margin: number
  markup: number
  validUntil: string | null
  createdAt: string
  updatedAt: string
  fileCount: number
  revisionCount: number
}

interface PartSalesListProps {
  initialPartSales: PartSale[]
}

export function PartSalesList({ initialPartSales }: PartSalesListProps) {
  const router = useRouter()
  const [partSales, setPartSales] = useState<PartSale[]>(initialPartSales)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadPartSales()
  }, [searchTerm, statusFilter])

  const loadPartSales = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/part-sales?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load part sales')
      const data = await response.json()
      
      if (data.success) {
        const formatted = data.data.map((ps: any) => {
          const firstBOM = ps.linkedBOMs?.[0] || null
          const bomParts = firstBOM?.parts || []
          const totalCost = bomParts.reduce((sum: number, part: any) => {
            return sum + Number(part.purchasePrice) * part.quantity
          }, 0)
          const totalCustomerPrice = bomParts.reduce((sum: number, part: any) => {
            return sum + Number(part.customerPrice)
          }, 0)
          const margin = totalCustomerPrice > 0 && totalCost > 0 
            ? ((totalCustomerPrice - totalCost) / totalCustomerPrice) * 100 
            : 0
          const markup = totalCost > 0 
            ? ((totalCustomerPrice - totalCost) / totalCost) * 100 
            : 0

          return {
            id: ps.id,
            quoteNumber: ps.quoteNumber,
            title: ps.title,
            customerName: ps.customer?.name || null,
            customerId: ps.customer?.id || null,
            bomId: firstBOM?.id || null,
            bomName: firstBOM?.name || null,
            status: ps.status,
            amount: ps.amount,
            totalCost,
            totalCustomerPrice,
            margin,
            markup,
            validUntil: ps.validUntil || null,
            createdAt: ps.createdAt,
            updatedAt: ps.updatedAt,
            fileCount: ps._count?.fileRecords || 0,
            revisionCount: ps._count?.revisions || 0,
          }
        })
        setPartSales(formatted)
      }
    } catch (error) {
      console.error('Error loading part sales:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'DRAFT': 'outline',
      'SENT': 'secondary',
      'WON': 'default',
      'LOST': 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const filteredPartSales = partSales.filter((ps) => {
    const matchesSearch = !searchTerm || 
      ps.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ps.customerName && ps.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || ps.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: partSales.length,
    draft: partSales.filter(p => p.status === 'DRAFT').length,
    sent: partSales.filter(p => p.status === 'SENT').length,
    won: partSales.filter(p => p.status === 'WON').length,
    lost: partSales.filter(p => p.status === 'LOST').length,
    totalValue: partSales.reduce((sum, p) => sum + p.totalCustomerPrice, 0),
    totalCost: partSales.reduce((sum, p) => sum + p.totalCost, 0),
    avgMargin: partSales.length > 0 
      ? partSales.reduce((sum, p) => sum + p.margin, 0) / partSales.length 
      : 0,
  }

  const handlePartSaleCreated = () => {
    setIsCreateDialogOpen(false)
    loadPartSales()
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="Part Sales"
        subtitle="Manage part sale quotes, track margins, and convert to jobs"
      >
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Part Sale
        </Button>
      </DashboardHeader>

      <DashboardContent>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Part Sales</div>
                  <div className="text-3xl font-bold">{stats.total}</div>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Value</div>
                  <div className="text-3xl font-bold">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Cost</div>
                  <div className="text-3xl font-bold">${stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Avg Margin</div>
                  <div className="text-3xl font-bold text-green-600">{stats.avgMargin.toFixed(1)}%</div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search part sales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="WON">Won</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Part Sales Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Markup</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        No part sales found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPartSales.map((ps) => (
                      <TableRow key={ps.id}>
                        <TableCell className="font-medium">{ps.quoteNumber}</TableCell>
                        <TableCell>{ps.title}</TableCell>
                        <TableCell>{ps.customerName || '—'}</TableCell>
                        <TableCell>{getStatusBadge(ps.status)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${ps.totalCustomerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          ${ps.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={ps.margin >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {ps.margin.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={ps.markup >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {ps.markup.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(ps.updatedAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/dashboard/part-sales/${ps.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/dashboard/part-sales/${ps.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
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

      <CreatePartSaleDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onPartSaleCreated={handlePartSaleCreated}
      />
    </DashboardPageContainer>
  )
}

