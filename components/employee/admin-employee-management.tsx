'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, Users, UserPlus, Search, Building2 } from 'lucide-react'
import { format } from 'date-fns'

interface Employee {
  id: string
  email: string
  name: string | null
  role: string
  position: string | null
  wage: number | null
  phone: string | null
  isActive: boolean
  managerId: string | null
  manager: {
    id: string
    name: string | null
    email: string
  } | null
  directReports: Array<{
    id: string
    name: string | null
    email: string
    role: string
    isActive: boolean
  }>
}

export function AdminEmployeeManagement() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'USER',
    position: '',
    wage: '',
    phone: '',
    managerId: '',
    isActive: true,
  })

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(emp =>
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredEmployees(filtered)
    } else {
      setFilteredEmployees(employees)
    }
  }, [searchTerm, employees])

  const loadEmployees = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/employees?includeInactive=true')
      const data = await response.json()
      
      if (!response.ok) {
        const errorMessage = data.error || `Failed to load employees: ${response.status} ${response.statusText}`
        const details = data.details ? `\n\nDetails: ${data.details}` : ''
        throw new Error(errorMessage + details)
      }
      
      setEmployees(data.employees || [])
      setFilteredEmployees(data.employees || [])
    } catch (error: any) {
      console.error('Error loading employees:', error)
      const errorMessage = error.message || 'Failed to load employees'
      
      // Check if it's a migration issue
      if (errorMessage.includes('managerId') || errorMessage.includes('does not exist')) {
        toast({
          title: 'Database Migration Required',
          description: 'Please run the database migration. See docs/FIX_EMPLOYEE_MANAGEMENT_ERROR.md for instructions.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setSelectedEmployee(employee)
      setIsEditMode(true)
      setFormData({
        email: employee.email,
        name: employee.name || '',
        role: employee.role,
        position: employee.position || '',
        wage: employee.wage ? employee.wage.toString() : '',
        phone: employee.phone || '',
        managerId: employee.managerId || '',
        isActive: employee.isActive,
      })
    } else {
      setSelectedEmployee(null)
      setIsEditMode(false)
      setFormData({
        email: '',
        name: '',
        role: 'USER',
        position: '',
        wage: '',
        phone: '',
        managerId: '',
        isActive: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedEmployee(null)
    setIsEditMode(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        wage: formData.wage ? parseFloat(formData.wage) : undefined,
        managerId: formData.managerId || null,
      }

      const url = isEditMode && selectedEmployee
        ? `/api/employees/${selectedEmployee.id}`
        : '/api/employees'
      const method = isEditMode ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save employee')
      }

      toast({
        title: 'Success',
        description: isEditMode ? 'Employee updated successfully' : 'Employee created successfully',
      })

      handleCloseDialog()
      loadEmployees()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save employee',
        variant: 'destructive',
      })
    }
  }

  const handleDeactivate = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to deactivate ${employee.name || employee.email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to deactivate employee')

      toast({
        title: 'Success',
        description: 'Employee deactivated successfully',
      })

      loadEmployees()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deactivate employee',
        variant: 'destructive',
      })
    }
  }

  const getManagerName = (managerId: string | null) => {
    if (!managerId) return 'None'
    const manager = employees.find(e => e.id === managerId)
    return manager?.name || manager?.email || 'Unknown'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading employees...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Management
            </CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Position</th>
                  <th className="text-left p-2">Manager</th>
                  <th className="text-left p-2">Direct Reports</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{employee.name || 'N/A'}</td>
                    <td className="p-2">{employee.email}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {employee.role}
                      </span>
                    </td>
                    <td className="p-2">{employee.position || 'N/A'}</td>
                    <td className="p-2">{getManagerName(employee.managerId)}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {employee.directReports.length}
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          employee.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(employee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {employee.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(employee)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update employee information and role assignments.'
                : 'Create a new employee account and assign role and manager.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isEditMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                      <SelectItem value="ENGINEER">Engineer</SelectItem>
                      <SelectItem value="TECHNICIAN">Technician</SelectItem>
                      <SelectItem value="SALES">Sales</SelectItem>
                      <SelectItem value="ACCOUNTING">Accounting</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wage">Wage</Label>
                  <Input
                    id="wage"
                    type="number"
                    step="0.01"
                    value={formData.wage}
                    onChange={(e) => setFormData({ ...formData, wage: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="managerId">Manager</Label>
                <Select
                  value={formData.managerId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, managerId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {employees
                      .filter(e => e.id !== selectedEmployee?.id && e.isActive)
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name || emp.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {isEditMode && (
                <div>
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    Active
                  </Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

