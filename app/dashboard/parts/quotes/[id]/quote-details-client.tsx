'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { BOMPartsTable } from '@/components/parts/bom-parts-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KanbanBoard } from '@/components/quotes/kanban-board'
import { MilestoneGanttView } from '@/components/jobs/milestone-gantt-view'

interface LaborCode {
  id: string
  code: string
  name: string
  category: string
  hourlyRate: number
}

interface QuotedLabor {
  laborCodeId: string
  estimatedHours: number
}

interface BOMPart {
  id: string
  bomId: string
  partId: string | null
  partNumber: string
  quantity: number
  purchasePrice: number
  markupPercent: number
  customerPrice: number
  manufacturer: string
  description: string | null
  source: string | null
  notes: string | null
  estimatedDelivery: string | null
  status: string
  originalPart?: {
    id: string
    partNumber: string
    manufacturer: string
    description: string | null
  } | null
}

interface BOM {
  id: string
  name: string
  parts: BOMPart[]
}

interface QuoteMilestone {
  id: string
  name: string
  description: string | null
  milestoneType: string
  scheduledStartDate: string | null
  scheduledEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  status: string
  billingPercentage: number | null
  isBillingTrigger: boolean
}

interface User {
  id: string
  name: string | null
  email: string
}

interface QuoteDetailsClientProps {
  quoteId: string
  quoteNumber: string
  laborCodes: LaborCode[]
  quotedLabor: QuotedLabor[]
  bom?: BOM | null
  milestones?: QuoteMilestone[]
  users?: User[]
}

interface Milestone {
  id: string
  name: string
  amount: number
  percentage: number
  dueDate: string
  status: 'pending' | 'completed'
}

export function QuoteDetailsClient({ 
  quoteId, 
  quoteNumber, 
  laborCodes, 
  quotedLabor, 
  bom, 
  milestones: initialMilestones = [], 
  users = [] 
}: QuoteDetailsClientProps) {
  const [mounted, setMounted] = useState(false)
  
  // Initialize quoted hours from database
  const [quotedHours, setQuotedHours] = useState<Record<string, number>>(() => {
    const hoursFromDB: Record<string, number> = {}
    quotedLabor.forEach(ql => {
      hoursFromDB[ql.laborCodeId] = ql.estimatedHours
    })
    return hoursFromDB
  })

  // Initialize milestones from database
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    return initialMilestones.map(m => ({
      id: m.id,
      name: m.name,
      amount: m.billingPercentage ? (quotedAmount * Number(m.billingPercentage)) / 100 : 0,
      percentage: m.billingPercentage ? Number(m.billingPercentage) : 0,
      dueDate: m.scheduledEndDate ? new Date(m.scheduledEndDate).toISOString().split('T')[0] : '',
      status: (m.status === 'COMPLETED' ? 'completed' : 'pending') as 'pending' | 'completed',
    }))
  })

  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [newMilestone, setNewMilestone] = useState({ name: '', percentage: 0, dueDate: '' })
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null)
  const [editingMilestoneData, setEditingMilestoneData] = useState({ name: '', percentage: 0, dueDate: '' })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate actual hours and costs from time entries (quotes don't have time entries, so this will be 0)
  const laborCodeData = useMemo(() => {
    const laborCodeMap = new Map<string, any>()
    
    // Initialize all labor codes with estimated values from state
    laborCodes.forEach(lc => {
      const estimatedHours = quotedHours[lc.id] || 0
      laborCodeMap.set(lc.id, {
        id: lc.id,
        code: lc.code,
        name: lc.name,
        category: lc.category,
        rate: lc.hourlyRate,
        estimatedHours,
        actualHours: 0, // Quotes don't have time entries
        estimatedCost: estimatedHours * lc.hourlyRate,
        actualCost: 0, // Quotes don't have time entries
        progress: 0
      })
    })
    
    return Array.from(laborCodeMap.values())
  }, [laborCodes, quotedHours])

  // Function to update quoted hours
  const updateQuotedHours = async (laborCodeId: string, hours: number) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/quoted-labor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laborCodeId,
          estimatedHours: hours
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update quoted hours')
      }

      setQuotedHours(prev => ({
        ...prev,
        [laborCodeId]: hours
      }))
    } catch (error: any) {
      console.error('Error updating quoted hours:', error)
      toast.error(error.message || 'Failed to update quoted hours')
    }
  }

  // Calculate quoted and actual amounts from labor tracking
  const quotedAmount = laborCodeData.reduce((sum, lc) => sum + lc.estimatedCost, 0)
  const actualAmount = 0 // Quotes don't have time entries

  const addMilestone = async () => {
    if (!newMilestone.name || newMilestone.percentage <= 0) {
      toast.error('Please fill in milestone name and percentage')
      return
    }

    try {
      const response = await fetch(`/api/quotes/${quoteId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMilestone.name,
          billingPercentage: newMilestone.percentage,
          scheduledEndDate: newMilestone.dueDate || null,
          milestoneType: 'OTHER',
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create milestone')
      }

      const calculatedAmount = (quotedAmount * newMilestone.percentage) / 100

      setMilestones(prev => [...prev, {
        id: data.data.id,
        name: newMilestone.name,
        amount: calculatedAmount,
        percentage: newMilestone.percentage,
        dueDate: newMilestone.dueDate,
        status: 'pending'
      }])
      
      setNewMilestone({ name: '', percentage: 0, dueDate: '' })
      setShowAddMilestone(false)
      toast.success('Milestone created successfully')
      window.location.reload()
    } catch (error: any) {
      console.error('Error creating milestone:', error)
      toast.error(error.message || 'Failed to create milestone')
    }
  }

  const startEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone.id)
    setEditingMilestoneData({
      name: milestone.name,
      amount: milestone.amount,
      percentage: milestone.percentage,
      dueDate: milestone.dueDate
    })
  }

  const saveEditMilestone = async () => {
    if (!editingMilestoneData.name || editingMilestoneData.percentage <= 0) {
      toast.error('Please fill in milestone name and percentage')
      return
    }

    if (!editingMilestone) {
      toast.error('No milestone selected for editing')
      return
    }

    try {
      const response = await fetch(`/api/quotes/${quoteId}/milestones/${editingMilestone}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingMilestoneData.name,
          scheduledEndDate: editingMilestoneData.dueDate ? new Date(editingMilestoneData.dueDate) : null,
          billingPercentage: editingMilestoneData.percentage,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update milestone')
      }

      const calculatedAmount = (quotedAmount * editingMilestoneData.percentage) / 100

      setMilestones(prev => prev.map(m => 
        m.id === editingMilestone 
          ? {
              ...m,
              name: editingMilestoneData.name,
              amount: calculatedAmount,
              percentage: editingMilestoneData.percentage,
              dueDate: editingMilestoneData.dueDate
            }
          : m
      ))
      
      setEditingMilestone(null)
      setEditingMilestoneData({ name: '', amount: 0, percentage: 0, dueDate: '' })
      toast.success('Milestone updated successfully')
      window.location.reload()
    } catch (error: any) {
      console.error('Error updating milestone:', error)
      toast.error(error.message || 'Failed to update milestone')
    }
  }

  const cancelEditMilestone = () => {
    setEditingMilestone(null)
    setEditingMilestoneData({ name: '', amount: 0, percentage: 0, dueDate: '' })
  }

  const refreshMilestone = (milestoneId: string) => {
    setMilestones(prev => prev.map(m => {
      if (m.id === milestoneId) {
        const newAmount = (quotedAmount * m.percentage) / 100
        return { ...m, amount: newAmount }
      }
      return m
    }))
    toast.success('Milestone amount refreshed')
  }

  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0)
  const totalMilestonePercentage = milestones.reduce((sum, m) => sum + m.percentage, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-8 w-full">
      {/* Tasks Kanban Board Section */}
      <Card className="border-2 border-blue-100 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-200">
          <CardTitle className="text-blue-900 font-bold">Tasks</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <KanbanBoard quoteId={quoteId} users={users} />
        </CardContent>
      </Card>

      {/* Milestones Section with Gantt View */}
      {initialMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="gantt" className="space-y-4">
              <TabsList>
                <TabsTrigger value="gantt">Gantt View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
              <TabsContent value="gantt">
                <MilestoneGanttView milestones={initialMilestones} />
              </TabsContent>
              <TabsContent value="list">
                <div className="space-y-2">
                  {initialMilestones.map((milestone) => (
                    <div key={milestone.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{milestone.name}</div>
                          {milestone.description && (
                            <div className="text-sm text-gray-600 mt-1">{milestone.description}</div>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            {milestone.scheduledStartDate && milestone.scheduledEndDate && (
                              <span>
                                Scheduled: {format(new Date(milestone.scheduledStartDate), 'MMM d')} - {format(new Date(milestone.scheduledEndDate), 'MMM d, yyyy')}
                              </span>
                            )}
                            {milestone.actualStartDate && milestone.actualEndDate && (
                              <span>
                                Actual: {format(new Date(milestone.actualStartDate), 'MMM d')} - {format(new Date(milestone.actualEndDate), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{milestone.milestoneType}</Badge>
                          <Badge
                            variant={
                              milestone.status === 'COMPLETED'
                                ? 'default'
                                : milestone.status === 'IN_PROGRESS'
                                ? 'secondary'
                                : milestone.status === 'BLOCKED'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {milestone.status.replace('_', ' ')}
                          </Badge>
                          {milestone.isBillingTrigger && (
                            <Badge variant="outline" className="border-green-500 text-green-700">
                              Billing
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Financial Information & Billing Milestones Section */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Information & Billing Milestones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Financial Overview Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-700 mb-1">Quoted Amount</div>
              <div className="text-3xl font-bold text-blue-900">
                ${quotedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-blue-600 mt-1">From labor code estimates</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-green-700 mb-1">Actual Amount</div>
              <div className="text-3xl font-bold text-green-900">
                {mounted ? `$${actualAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
              </div>
              <div className="text-xs text-green-600 mt-1">From time entries (N/A for quotes)</div>
            </div>
          </div>

          {/* Billing Milestones */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Billing Milestones</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddMilestone(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">${totalMilestoneAmount.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalMilestonePercentage}%</div>
              <div className="text-sm text-gray-500">Total Percentage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{milestones.length}</div>
              <div className="text-sm text-gray-500">Milestones</div>
            </div>
          </div>

          {/* Add Milestone Form */}
          {showAddMilestone && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-3">Add New Milestone</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Name</label>
                  <Input
                    placeholder="e.g., Initial Design Review"
                    value={newMilestone.name}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 25"
                    value={newMilestone.percentage || ''}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, percentage: Number(e.target.value) || 0 }))}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Amount: ${((quotedAmount * (newMilestone.percentage || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                  <Input
                    type="date"
                    value={newMilestone.dueDate}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex space-x-2 mt-3">
                <Button size="sm" onClick={addMilestone}>Add Milestone</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddMilestone(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Milestones Table */}
          {milestones.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Milestone</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Percentage</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Due Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {milestones.map((milestone) => (
                    <tr key={milestone.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{milestone.name}</td>
                      <td className="py-3 px-4">{milestone.percentage}%</td>
                      <td className="py-3 px-4 font-semibold text-blue-600">
                        ${milestone.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{milestone.dueDate || 'Not set'}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(milestone.status)}>
                          {milestone.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center space-x-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => refreshMilestone(milestone.id)}
                            title="Refresh amount based on current quoted hours"
                          >
                            <RefreshCw className="h-3 w-3 text-blue-500" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => startEditMilestone(milestone)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={async () => {
                              if (!confirm('Are you sure you want to delete this milestone?')) {
                                return
                              }
                              try {
                                const response = await fetch(`/api/quotes/${quoteId}/milestones/${milestone.id}`, {
                                  method: 'DELETE',
                                })
                                const data = await response.json()
                                if (response.ok && data.success) {
                                  setMilestones(prev => prev.filter(m => m.id !== milestone.id))
                                  toast.success('Milestone deleted')
                                  window.location.reload()
                                } else {
                                  throw new Error(data.error || 'Failed to delete milestone')
                                }
                              } catch (error: any) {
                                console.error('Error deleting milestone:', error)
                                toast.error(error.message || 'Failed to delete milestone')
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4">{totalMilestonePercentage}%</td>
                    <td className="py-3 px-4 text-blue-700">
                      ${totalMilestoneAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4" colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No milestones created yet.</p>
              <p className="text-sm mt-2">Add quoted hours above and create milestones to track billing progress.</p>
            </div>
          )}

          {/* Edit Milestone Modal */}
          {editingMilestone && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                <h4 className="font-semibold text-lg mb-4">Edit Milestone</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Name</label>
                    <Input
                      placeholder="e.g., Initial Design Review"
                      value={editingMilestoneData.name}
                      onChange={(e) => setEditingMilestoneData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
                    <Input
                      type="number"
                      placeholder="e.g., 25"
                      value={editingMilestoneData.percentage || ''}
                      onChange={(e) => setEditingMilestoneData(prev => ({ ...prev, percentage: Number(e.target.value) || 0 }))}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Amount: ${((quotedAmount * (editingMilestoneData.percentage || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                    <Input
                      type="date"
                      value={editingMilestoneData.dueDate}
                      onChange={(e) => setEditingMilestoneData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={cancelEditMilestone}>Cancel</Button>
                  <Button onClick={saveEditMilestone}>Save Changes</Button>
                </div>
              </div>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Labor Tracking - Quoted Hours Only (Quotes don't have actual hours) */}
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between mb-4">
            <CardTitle className="text-blue-700">Quoted Hours</CardTitle>
            <div className="flex items-baseline space-x-4">
              <div className="text-2xl font-bold text-blue-600">
                {laborCodeData.reduce((sum, lc) => sum + lc.estimatedHours, 0)}
              </div>
              <div className="text-2xl font-bold text-purple-600">
                ${laborCodeData.reduce((sum, lc) => sum + lc.estimatedCost, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quoted Labor Table */}
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-24" />
                <col />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-28" />
              </colgroup>
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Code</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Name</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Rate</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Hours</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Cost</th>
                </tr>
              </thead>
              <tbody>
                {laborCodeData.map((lc) => (
                  <tr key={lc.id} className="border-b hover:bg-gray-50 h-12">
                    <td className="py-2 px-3 font-medium font-mono text-sm align-middle">{lc.code}</td>
                    <td className="py-2 px-3 text-xs align-middle">{lc.name}</td>
                    <td className="py-2 px-3 text-sm align-middle">${lc.rate}/hr</td>
                    <td className="py-2 px-3 align-middle">
                      <input
                        type="number"
                        value={lc.estimatedHours}
                        onChange={(e) => {
                          const newHours = parseFloat(e.target.value) || 0
                          updateQuotedHours(lc.id, newHours)
                        }}
                        className="w-full h-7 px-2 py-1 border rounded text-sm border-gray-300"
                        min="0"
                        step="0.5"
                        placeholder="0"
                        title="Edit quoted hours"
                      />
                    </td>
                    <td className="py-2 px-3 align-middle">
                      <div className={lc.estimatedCost > 0 ? "text-blue-600 font-medium text-sm" : "text-gray-400 text-sm"}>
                        ${lc.estimatedCost.toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Bill of Materials */}
      {bom && bom.parts.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-baseline justify-between mb-4">
                <CardTitle className="text-purple-700">Bill of Materials</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <BOMPartsTable
                bomId={bom.id}
                parts={bom.parts}
                onPartUpdated={() => {
                  // Refresh the page to show updated BOM
                  window.location.reload()
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

