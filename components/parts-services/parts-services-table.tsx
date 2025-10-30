'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Eye, Edit, Trash2, MoreHorizontal, Search, Calendar, CheckSquare, Square, Folder } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { EditPartsServiceDialog } from './edit-parts-service-dialog'

interface PartsService {
  id: string
  jobNumber: string
  createdBy: string | null
  customerName: string | null
  custContact: string | null
  description: string | null
  vendor: string | null
  startDate: Date | null
  dueDate: Date | null
  jobStatus: string | null
  inQuickBooks: boolean
  inLDrive: boolean
  quoteNumber: string | null
  invoiced: string | null
  dateInvoiced: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

interface PartsServicesTableProps {
  partsServices: PartsService[]
}

export function PartsServicesTable({ partsServices: initialPartsServices }: PartsServicesTableProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [partsServices, setPartsServices] = useState<PartsService[]>(initialPartsServices)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [customerFilter, setCustomerFilter] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingPartsService, setEditingPartsService] = useState<PartsService | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const isAdmin = session?.user?.role === 'ADMIN'

  // Get unique values for filters
  const uniqueStatuses = Array.from(new Set(partsServices.map(ps => ps.jobStatus).filter(Boolean))).sort()
  const uniqueCustomers = Array.from(new Set(partsServices.map(ps => ps.customerName).filter(Boolean))).sort()
  const uniqueVendors = Array.from(new Set(partsServices.map(ps => ps.vendor).filter(Boolean))).sort()

  // Filter parts and services
  const filteredPartsServices = partsServices.filter(ps => {
    const matchesSearch = !searchTerm || 
      ps.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.quoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || ps.jobStatus === statusFilter
    const matchesCustomer = !customerFilter || ps.customerName === customerFilter
    const matchesVendor = !vendorFilter || ps.vendor === vendorFilter
    
    return matchesSearch && matchesStatus && matchesCustomer && matchesVendor
  })

  const handleEdit = (partsService: PartsService) => {
    setEditingPartsService(partsService)
    setIsEditDialogOpen(true)
  }

  const handleEditSave = () => {
    // Refresh will be handled by the dialog
    setIsEditDialogOpen(false)
    setEditingPartsService(null)
  }

  const handleDelete = async (id: string, jobNumber: string) => {
    if (!confirm(`Are you sure you want to delete ${jobNumber}? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/parts-services/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      setPartsServices(prev => prev.filter(ps => ps.id !== id))
      toast.success('Parts/Service deleted successfully')
      router.refresh()
    } catch (error) {
      console.error('Error deleting parts/service:', error)
      toast.error('Failed to delete parts/service')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    const statusLower = status.toLowerCase()
    if (statusLower.includes('billed') || statusLower.includes('complete')) {
      return 'bg-green-100 text-green-800'
    }
    if (statusLower.includes('pending') || statusLower.includes('in progress')) {
      return 'bg-yellow-100 text-yellow-800'
    }
    if (statusLower.includes('cancelled') || statusLower.includes('rejected')) {
      return 'bg-red-100 text-red-800'
    }
    return 'bg-blue-100 text-blue-800'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Parts & Services</CardTitle>
          <div className="text-sm text-gray-500">
            Showing {filteredPartsServices.length} of {partsServices.length} items
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search job #, description, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">All Statuses</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All Customers</option>
            {uniqueCustomers.map(customer => (
              <option key={customer} value={customer}>{customer}</option>
            ))}
          </select>
          
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All Vendors</option>
            {uniqueVendors.map(vendor => (
              <option key={vendor} value={vendor}>{vendor}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-24">Job #</TableHead>
                <TableHead className="w-32">Customer</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-28">Vendor</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24">Start</TableHead>
                <TableHead className="w-24">Due</TableHead>
                <TableHead className="w-20">Invoiced</TableHead>
                <TableHead className="w-12 text-center">QB</TableHead>
                <TableHead className="w-12 text-center">LD</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartsServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                    No parts or services found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPartsServices.map((ps) => (
                  <TableRow 
                    key={ps.id} 
                    className={`text-sm transition-colors ${
                      isAdmin 
                        ? 'hover:bg-blue-50 cursor-pointer' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => isAdmin && handleEdit(ps)}
                  >
                    <TableCell className="font-medium py-2">
                      <div className="flex flex-col">
                        <span className="text-blue-600 font-semibold text-xs">{ps.jobNumber}</span>
                        {ps.quoteNumber && (
                          <span className="text-[10px] text-gray-500">{ps.quoteNumber}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-xs truncate max-w-[120px]" title={ps.customerName || ''}>
                          {ps.customerName || '-'}
                        </span>
                        {ps.custContact && (
                          <span className="text-[10px] text-gray-500 truncate max-w-[120px]" title={ps.custContact}>
                            {ps.custContact}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-xs truncate max-w-[200px]" title={ps.description || ''}>
                        {ps.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs truncate block max-w-[100px]" title={ps.vendor || ''}>
                        {ps.vendor || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      {ps.jobStatus ? (
                        <Badge className={`${getStatusColor(ps.jobStatus)} text-[10px] px-1.5 py-0`}>
                          {ps.jobStatus}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {ps.startDate ? (
                        <span className="text-xs whitespace-nowrap">
                          {format(new Date(ps.startDate), 'MM/dd/yy')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {ps.dueDate ? (
                        <span className="text-xs whitespace-nowrap">
                          {format(new Date(ps.dueDate), 'MM/dd/yy')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col text-xs">
                        {ps.invoiced && <span className="font-medium">{ps.invoiced}</span>}
                        {ps.dateInvoiced && (
                          <span className="text-[10px] text-gray-500">
                            {format(new Date(ps.dateInvoiced), 'MM/dd/yy')}
                          </span>
                        )}
                        {!ps.invoiced && !ps.dateInvoiced && <span className="text-gray-400">-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {ps.inQuickBooks ? (
                        <CheckSquare className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {ps.inLDrive ? (
                        <Folder className="h-4 w-4 text-blue-600 mx-auto" />
                      ) : (
                        <Folder className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(ps)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(ps.id, ps.jobNumber)
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <EditPartsServiceDialog
        partsService={editingPartsService}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setEditingPartsService(null)
        }}
        onSave={handleEditSave}
      />
    </Card>
  )
}

