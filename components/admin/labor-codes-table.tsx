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
import { MoreHorizontal, Edit, Trash2, DollarSign, Code, Save, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface LaborCode {
  id: string
  code: string
  name: string
  description: string | null
  category: string
  hourlyRate: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface LaborCodesTableProps {
  laborCodes: LaborCode[]
  categories: string[]
}

export function LaborCodesTable({ laborCodes, categories }: LaborCodesTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<LaborCode>>({})

  const filteredLaborCodes = laborCodes.filter(code => {
    const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         code.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         code.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'ALL' || code.category === categoryFilter
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ACTIVE' && code.isActive) ||
                         (statusFilter === 'INACTIVE' && !code.isActive)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const deleteLaborCode = async (laborCodeId: string) => {
    if (!confirm('Are you sure you want to delete this labor code? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/labor-codes/${laborCodeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Labor code deleted successfully')
        router.refresh()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to delete labor code: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting labor code:', error)
      toast.error('An error occurred while deleting the labor code')
    }
  }

  const toggleActiveStatus = async (laborCodeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/labor-codes/${laborCodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus
        }),
      })

      if (response.ok) {
        toast.success(`Labor code ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
        router.refresh()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to update labor code: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating labor code:', error)
      toast.error('An error occurred while updating the labor code')
    }
  }

  const startEditing = (code: LaborCode) => {
    setEditingId(code.id)
    setEditingData({
      code: code.code,
      name: code.name,
      description: code.description || '',
      category: code.category,
      hourlyRate: code.hourlyRate,
      isActive: code.isActive
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData({})
  }

  const saveEditing = async () => {
    if (!editingId) return

    try {
      const response = await fetch(`/api/labor-codes/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingData),
      })

      if (response.ok) {
        toast.success('Labor code updated successfully')
        setEditingId(null)
        setEditingData({})
        router.refresh()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to update labor code: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating labor code:', error)
      toast.error('An error occurred while updating the labor code')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Labor Codes</CardTitle>
          <div className="flex items-center space-x-4">
            <input
              placeholder="Search labor codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="ALL">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setCategoryFilter('ALL')
                setStatusFilter('ALL')
              }}
              className="text-xs"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredLaborCodes.length} of {laborCodes.length} labor codes
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLaborCodes.map((code) => (
              <TableRow key={code.id} className={editingId === code.id ? 'bg-blue-50' : ''}>
                <TableCell className="font-medium">
                  {editingId === code.id ? (
                    <Input
                      value={editingData.code || ''}
                      onChange={(e) => setEditingData({...editingData, code: e.target.value})}
                      className="w-20"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-blue-500" />
                      {code.code}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === code.id ? (
                    <Input
                      value={editingData.name || ''}
                      onChange={(e) => setEditingData({...editingData, name: e.target.value})}
                      className="w-48"
                    />
                  ) : (
                    code.name
                  )}
                </TableCell>
                <TableCell>
                  {editingId === code.id ? (
                    <select
                      value={editingData.category || ''}
                      onChange={(e) => setEditingData({...editingData, category: e.target.value})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="Administration Phase">Administration Phase</option>
                      <option value="Project Phase">Project Phase</option>
                    </select>
                  ) : (
                    <Badge variant="outline">{code.category}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === code.id ? (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-green-500" />
                      <Input
                        type="number"
                        step="0.01"
                        value={editingData.hourlyRate || 0}
                        onChange={(e) => setEditingData({...editingData, hourlyRate: parseFloat(e.target.value) || 0})}
                        className="w-20"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-green-500" />
                      ${code.hourlyRate.toFixed(2)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === code.id ? (
                    <select
                      value={editingData.isActive ? 'true' : 'false'}
                      onChange={(e) => setEditingData({...editingData, isActive: e.target.value === 'true'})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  ) : (
                    <Badge className={code.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {code.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  {editingId === code.id ? (
                    <Input
                      value={editingData.description || ''}
                      onChange={(e) => setEditingData({...editingData, description: e.target.value})}
                      className="w-48"
                      placeholder="Description"
                    />
                  ) : (
                    <span className="truncate block">
                      {code.description || 'No description'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === code.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={saveEditing}
                        className="h-6 w-6 p-0"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditing(code)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => toggleActiveStatus(code.id, code.isActive)}
                        >
                          {code.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => deleteLaborCode(code.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


