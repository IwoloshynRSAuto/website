'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Edit, Save, X, Plus, Trash2, UserCheck, UserX } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Employee {
  id: string
  name: string | null
  email: string
  role: string
  isActive: boolean
  position: string | null
  wage: number | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
}

interface EmployeesTableProps {
  employees: Employee[]
}

export function EmployeesTable({ employees: initialEmployees }: EmployeesTableProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<Employee>>({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const startEditing = (employee: Employee) => {
    setEditingId(employee.id)
    setEditingData({
      name: employee.name || '',
      email: employee.email,
      role: employee.role,
      position: employee.position || '',
      wage: employee.wage || 0,
      phone: employee.phone || '',
      isActive: employee.isActive
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData({})
  }

  const saveEditing = async () => {
    if (!editingId) return

    setLoading(true)
    try {
      // Clean up the data - convert empty strings to null for optional fields
      const cleanedData = {
        ...editingData,
        position: editingData.position === '' ? null : editingData.position,
        phone: editingData.phone === '' ? null : editingData.phone,
        wage: editingData.wage === 0 ? null : editingData.wage,
      }

      const response = await fetch(`/api/users/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData)
      })

      if (response.ok) {
        const updatedEmployee = await response.json()
        setEmployees(employees.map(emp => 
          emp.id === editingId ? { ...emp, ...updatedEmployee } : emp
        ))
        toast.success('Employee updated successfully')
        cancelEditing()
      } else {
        const error = await response.json()
        toast.error(`Failed to update employee: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      toast.error('Failed to update employee')
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (employeeId: string, currentStatus: boolean) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
        setEmployees(employees.map(emp => 
          emp.id === employeeId ? { ...emp, isActive: !currentStatus } : emp
        ))
        toast.success(`Employee ${!currentStatus ? 'activated' : 'deactivated'}`)
      } else {
        const error = await response.json()
        toast.error(`Failed to update employee: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      toast.error('Failed to update employee')
    } finally {
      setLoading(false)
    }
  }

  const deleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== employeeId))
        toast.success('Employee deleted successfully')
      } else {
        const error = await response.json()
        toast.error(`Failed to delete employee: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast.error('Failed to delete employee')
    } finally {
      setLoading(false)
    }
  }


  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (employee.name && employee.name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesRole = roleFilter === 'ALL' || employee.role === roleFilter
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ACTIVE' && employee.isActive) ||
                         (statusFilter === 'INACTIVE' && !employee.isActive)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="USER">User</option>
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
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2">Name</TableHead>
              <TableHead className="py-2">Email</TableHead>
              <TableHead className="py-2">Position</TableHead>
              <TableHead className="py-2">Wage</TableHead>
              <TableHead className="py-2">Phone</TableHead>
              <TableHead className="py-2">Role</TableHead>
              <TableHead className="py-2">Status</TableHead>
              <TableHead className="py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow 
                key={employee.id} 
                className={`hover:bg-gray-50 ${editingId === employee.id ? 'bg-blue-50' : ''}`}
              >
                <TableCell className="py-2">
                  {editingId === employee.id ? (
                    <Input
                      value={editingData.name || ''}
                      onChange={(e) => setEditingData({...editingData, name: e.target.value})}
                      placeholder="Employee name"
                    />
                  ) : (
                    <div className="font-medium">{employee.name || 'No name'}</div>
                  )}
                </TableCell>
                
                <TableCell className="py-2">
                  {editingId === employee.id ? (
                    <Input
                      value={editingData.email || ''}
                      onChange={(e) => setEditingData({...editingData, email: e.target.value})}
                      placeholder="Email address"
                      type="email"
                    />
                  ) : (
                    <div className="text-sm text-gray-600">{employee.email}</div>
                  )}
                </TableCell>
                
                <TableCell className="py-2">
                  {editingId === employee.id ? (
                    <Input
                      value={editingData.position || ''}
                      onChange={(e) => setEditingData({...editingData, position: e.target.value})}
                      placeholder="Job position"
                    />
                  ) : (
                    <div className="text-sm">{employee.position || 'Not set'}</div>
                  )}
                </TableCell>
                
                <TableCell className="py-2">
                  {editingId === employee.id ? (
                    <Input
                      value={editingData.wage || ''}
                      onChange={(e) => setEditingData({...editingData, wage: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  ) : (
                    <div className="text-sm">
                      {employee.wage ? `$${employee.wage.toFixed(2)}` : 'Not set'}
                    </div>
                  )}
                </TableCell>
                
                <TableCell className="py-2">
                  {editingId === employee.id ? (
                    <Input
                      value={editingData.phone || ''}
                      onChange={(e) => setEditingData({...editingData, phone: e.target.value})}
                      placeholder="Phone number"
                      type="tel"
                    />
                  ) : (
                    <div className="text-sm">{employee.phone || 'Not set'}</div>
                  )}
                </TableCell>
                
                <TableCell className="py-2">
                  {editingId === employee.id ? (
                    <select
                      value={editingData.role || ''}
                      onChange={(e) => setEditingData({...editingData, role: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  ) : (
                    <Badge variant={employee.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {employee.role}
                    </Badge>
                  )}
                </TableCell>
                
                <TableCell className="py-2">
                  <Badge variant={employee.isActive ? 'default' : 'destructive'}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                
                <TableCell className="py-2">
                  {editingId === employee.id ? (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={saveEditing}
                        disabled={loading}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={loading}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditing(employee)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => toggleActive(employee.id, employee.isActive)}
                        >
                          {employee.isActive ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteEmployee(employee.id)}
                          className="text-red-600"
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
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No employees found matching your criteria.
        </div>
      )}
    </div>
  )
}



