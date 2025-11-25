'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Clock, DollarSign, Calculator, RefreshCw, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { SubmitECOModal } from '@/components/jobs/submit-eco-modal'
import { BOMPartsTable } from '@/components/parts/bom-parts-table'
import { BulkBOMUpdate } from '@/components/jobs/bulk-bom-update'
import { MilestoneGanttView } from '@/components/jobs/milestone-gantt-view'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KanbanBoard } from '@/components/jobs/kanban-board'
import { LaborCodeDrillDownModal } from '@/components/jobs/labor-code-drill-down-modal'

interface Milestone {
  id: string
  name: string
  amount: number
  percentage: number
  dueDate: string
  status: 'pending' | 'completed'
}

interface Deliverable {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'delivered' | 'accepted'
  dueDate: string
}

interface LaborCodeEntry {
  id: string
  code: string
  name: string
  category: string
  rate: number
  estimatedHours: number
  actualHours: number
  estimatedCost: number
  actualCost: number
  progress: number
}

interface LaborCode {
  id: string
  code: string
  name: string
  category: string
  hourlyRate: number
}

interface TimeEntry {
  id: string
  regularHours: number
  overtimeHours: number
  laborCodeId: string | null
  laborCode: LaborCode | null
  user: {
    name: string | null
  } | null
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

interface JobMilestone {
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

interface JobDetailsClientProps {
  jobId: string
  jobNumber: string
  laborCodes: LaborCode[]
  timeEntries: TimeEntry[]
  quotedLabor: QuotedLabor[]
  jobType: string
  relatedQuoteId?: string | null
  users: Array<{ id: string; name: string | null; email: string }>
  bom?: BOM | null
  milestones?: JobMilestone[]
}

export function JobDetailsClient({ jobId, jobNumber, laborCodes, timeEntries, quotedLabor, jobType, relatedQuoteId, users, bom, milestones: initialMilestones = [] }: JobDetailsClientProps) {
  const [mounted, setMounted] = useState(false)



  // Drill-down modal state
  const [drillDownLaborCode, setDrillDownLaborCode] = useState<{ id: string, name: string } | null>(null)
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false)

  // Check if we're in ECO editing mode
  const [isECOMode, setIsECOMode] = useState(false)
  const [ecoChanges, setEcoChanges] = useState<Record<string, number>>({})

  // Check if this job is locked (converted from quote)
  const isJobLocked = !!(jobType === 'JOB' && relatedQuoteId && !isECOMode)

  // ECO submission state
  const [ecoSubmitted, setEcoSubmitted] = useState(false)

  // Initialize quoted hours from database, fall back to localStorage for migration
  const [quotedHours, setQuotedHours] = useState<Record<string, number>>(() => {
    // First, try to use database data
    const hoursFromDB: Record<string, number> = {}
    quotedLabor.forEach(ql => {
      hoursFromDB[ql.laborCodeId] = ql.estimatedHours
    })

    // If we have database data, use it
    if (Object.keys(hoursFromDB).length > 0) {
      return hoursFromDB
    }

    // Otherwise, check localStorage for backward compatibility
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`quotedHours_${jobId}`)
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })

  const [milestones, setMilestones] = useState<Milestone[]>([])

  useEffect(() => {
    setMounted(true)

    // Check URL parameters for ECO mode
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const ecoMode = urlParams.get('ecoMode')

      if (ecoMode === 'true') {
        setIsECOMode(true)
      }
    }
  }, [])



  const [deliverables, setDeliverables] = useState<Deliverable[]>([
    {
      id: '1',
      name: 'Review Quote',
      description: 'Review and approve quote specifications',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
    }
  ])

  // Calculate actual hours and costs from time entries
  const laborCodeData = useMemo(() => {
    const laborCodeMap = new Map<string, LaborCodeEntry>()

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
        actualHours: 0,
        estimatedCost: estimatedHours * lc.hourlyRate,
        actualCost: 0,
        progress: 0
      })
    })

    // Calculate actual hours and costs from time entries
    timeEntries.forEach(entry => {
      if (entry.laborCodeId && laborCodeMap.has(entry.laborCodeId)) {
        const laborCode = laborCodeMap.get(entry.laborCodeId)!
        const totalHours = entry.regularHours + entry.overtimeHours
        const cost = totalHours * (entry.laborCode?.hourlyRate || 0)

        laborCodeMap.set(entry.laborCodeId, {
          ...laborCode,
          actualHours: laborCode.actualHours + totalHours,
          actualCost: laborCode.actualCost + cost
        })
      }
    })

    // Calculate progress percentages
    laborCodeMap.forEach((lc, id) => {
      if (lc.estimatedHours > 0) {
        lc.progress = Math.round((lc.actualHours / lc.estimatedHours) * 100)
      }
    })

    return Array.from(laborCodeMap.values())
  }, [laborCodes, timeEntries, quotedHours])

  // Function to update quoted hours
  const updateQuotedHours = async (laborCodeId: string, hours: number) => {
    try {
      if (isECOMode) {
        // In ECO mode, track changes instead of updating directly
        setEcoChanges(prev => ({
          ...prev,
          [laborCodeId]: hours
        }))

        const laborCode = laborCodes.find(lc => lc.id === laborCodeId)
        toast.success(`ECO Change: Updated ${laborCode?.code} to ${hours} hours`)
      } else {
        // Normal mode - update directly
        const newQuotedHours = {
          ...quotedHours,
          [laborCodeId]: hours
        }
        setQuotedHours(newQuotedHours)

        // Save to database via API
        const endpoint = jobType === 'QUOTE'
          ? `/api/quotes/${jobId}/quoted-labor`
          : `/api/jobs/${jobId}/quoted-labor`

        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            laborCodeId,
            estimatedHours: hours
          })
        })

        if (!response.ok) {
          console.error('Failed to save quoted hours to database')
        }

        const laborCode = laborCodes.find(lc => lc.id === laborCodeId)
        toast.success(`Updated quoted hours for ${laborCode?.code} to ${hours}`)
      }
    } catch (error) {
      console.error('Error updating quoted hours:', error)
      toast.error('Failed to update quoted hours')
    }
  }

  const handleSubmitECO = async () => {
    if (Object.keys(ecoChanges).length === 0) {
      toast.error('No changes to submit')
      return
    }

    try {
      // Create ECO with the changes
      const response = await fetch('/api/eco', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          laborChanges: Object.entries(ecoChanges).map(([laborCodeId, hours]) => ({
            id: `eco-${laborCodeId}`,
            laborCodeId,
            hours
          })),
          reasonForChange: 'ECO changes submitted via job details page'
        })
      })

      if (response.ok) {
        toast.success('ECO submitted successfully!')
        setEcoSubmitted(true)
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit ECO')
      }
    } catch (error) {
      console.error('Error submitting ECO:', error)
      toast.error('Failed to submit ECO')
    }
  }

  const handleECOSubmitted = () => {
    setEcoSubmitted(true)
    // Refresh the page to show updated data
    window.location.reload()
  }

  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [showAddDeliverable, setShowAddDeliverable] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null)
  const [editingDeliverable, setEditingDeliverable] = useState<string | null>(null)
  const [editingMilestoneData, setEditingMilestoneData] = useState({
    name: '',
    amount: 0,
    percentage: 0,
    dueDate: ''
  })
  const [editingDeliverableData, setEditingDeliverableData] = useState({
    name: '',
    description: '',
    status: 'pending',
    dueDate: ''
  })

  const [newMilestone, setNewMilestone] = useState({
    name: '',
    amount: 0,
    percentage: 0,
    dueDate: ''
  })

  const [newDeliverable, setNewDeliverable] = useState({
    name: '',
    description: '',
    dueDate: ''
  })

  const addMilestone = async () => {
    if (!newMilestone.name || newMilestone.percentage <= 0) {
      toast.error('Please fill in milestone name and percentage')
      return
    }

    const calculatedAmount = (quotedAmount * newMilestone.percentage) / 100

    try {
      const endpoint = jobType === 'QUOTE'
        ? `/api/quotes/${jobId}/milestones`
        : `/api/jobs/${jobId}/milestones`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMilestone.name,
          billingPercentage: newMilestone.percentage,
          isBillingTrigger: true,
          scheduledEndDate: newMilestone.dueDate ? new Date(newMilestone.dueDate).toISOString() : null,
          status: 'NOT_STARTED'
        })
      })

      if (response.ok) {
        const result = await response.json()
        const createdMilestone = result.data

        const milestone: Milestone = {
          id: createdMilestone.id,
          name: createdMilestone.name,
          amount: calculatedAmount,
          percentage: createdMilestone.billingPercentage || newMilestone.percentage,
          dueDate: createdMilestone.scheduledEndDate ? createdMilestone.scheduledEndDate.split('T')[0] : '',
          status: 'pending'
        }

        setMilestones(prev => [...prev, milestone])
        setNewMilestone({ name: '', amount: 0, percentage: 0, dueDate: '' })
        setShowAddMilestone(false)
        toast.success('Milestone added successfully')

        // Reload to update Gantt view
        window.location.reload()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add milestone')
      }
    } catch (error) {
      console.error('Error adding milestone:', error)
      toast.error('Failed to add milestone')
    }
  }

  const addDeliverable = () => {
    if (!newDeliverable.name || !newDeliverable.description) {
      toast.error('Please fill in all required fields')
      return
    }

    const deliverable: Deliverable = {
      id: Date.now().toString(),
      name: newDeliverable.name,
      description: newDeliverable.description,
      status: 'pending',
      dueDate: newDeliverable.dueDate
    }

    setDeliverables(prev => [...prev, deliverable])
    setNewDeliverable({ name: '', description: '', dueDate: '' })
    setShowAddDeliverable(false)
    toast.success('Deliverable added successfully')
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

    if (!editingMilestone) return

    const calculatedAmount = (quotedAmount * editingMilestoneData.percentage) / 100

    try {
      const endpoint = jobType === 'QUOTE'
        ? `/api/quotes/${jobId}/milestones/${editingMilestone}`
        : `/api/jobs/${jobId}/milestones/${editingMilestone}`

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingMilestoneData.name,
          billingPercentage: editingMilestoneData.percentage,
          scheduledEndDate: editingMilestoneData.dueDate ? new Date(editingMilestoneData.dueDate).toISOString() : null,
        })
      })

      if (response.ok) {
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

        // Reload to update Gantt view
        window.location.reload()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update milestone')
      }
    } catch (error) {
      console.error('Error updating milestone:', error)
      toast.error('Failed to update milestone')
    }
  }

  const cancelEditMilestone = () => {
    setEditingMilestone(null)
    setEditingMilestoneData({ name: '', amount: 0, percentage: 0, dueDate: '' })
  }

  const startEditDeliverable = (deliverable: Deliverable) => {
    setEditingDeliverable(deliverable.id)
    setEditingDeliverableData({
      name: deliverable.name,
      description: deliverable.description,
      status: deliverable.status,
      dueDate: deliverable.dueDate
    })
  }

  const saveEditDeliverable = () => {
    if (!editingDeliverableData.name || !editingDeliverableData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    setDeliverables(prev => prev.map(d =>
      d.id === editingDeliverable
        ? {
          ...d,
          name: editingDeliverableData.name,
          description: editingDeliverableData.description,
          status: editingDeliverableData.status as 'pending' | 'in_progress' | 'completed' | 'delivered' | 'accepted',
          dueDate: editingDeliverableData.dueDate
        }
        : d
    ))

    setEditingDeliverable(null)
    setEditingDeliverableData({ name: '', description: '', status: 'pending', dueDate: '' })
    toast.success('Deliverable updated successfully')
  }

  const cancelEditDeliverable = () => {
    setEditingDeliverable(null)
    setEditingDeliverableData({ name: '', description: '', status: 'pending', dueDate: '' })
  }

  const updateLaborCodeHours = (laborCodeId: string, hours: number) => {
    toast.success(`Updated hours for labor code ${laborCodeId}: ${hours}`)
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

  const deleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return

    try {
      const endpoint = jobType === 'QUOTE'
        ? `/api/quotes/${jobId}/milestones/${milestoneId}`
        : `/api/jobs/${jobId}/milestones/${milestoneId}`

      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMilestones(prev => prev.filter(m => m.id !== milestoneId))
        toast.success('Milestone deleted')
        // Reload to update Gantt view
        window.location.reload()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete milestone')
      }
    } catch (error) {
      console.error('Error deleting milestone:', error)
      toast.error('Failed to delete milestone')
    }
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-purple-100 text-purple-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0)
  const totalMilestonePercentage = milestones.reduce((sum, m) => sum + m.percentage, 0)

  const deliverableCounts = deliverables.reduce((counts, d) => {
    counts[d.status] = (counts[d.status] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  // Calculate quoted and actual amounts from labor tracking
  const quotedAmount = laborCodeData.reduce((sum, lc) => sum + lc.estimatedCost, 0)
  const actualAmount = laborCodeData.reduce((sum, lc) => sum + lc.actualCost, 0)

  // Initialize milestones from props
  useEffect(() => {
    if (initialMilestones.length > 0) {
      const mappedMilestones: Milestone[] = initialMilestones
        .filter(m => m.isBillingTrigger)
        .map(m => ({
          id: m.id,
          name: m.name,
          amount: (quotedAmount * (m.billingPercentage || 0)) / 100,
          percentage: m.billingPercentage || 0,
          dueDate: m.scheduledEndDate ? m.scheduledEndDate.split('T')[0] : '',
          status: m.status === 'COMPLETED' ? 'completed' : 'pending'
        }))
      setMilestones(mappedMilestones)
    }
  }, [initialMilestones, quotedAmount])

  return (
    <div className="space-y-8 w-full">
      {/* Task Kanban Board - Above Deliverables */}
      <KanbanBoard
        jobId={jobType === 'JOB' ? jobId : undefined}
        quoteId={jobType === 'QUOTE' ? jobId : undefined}
        jobType={jobType as 'JOB' | 'QUOTE'}
        users={users}
      />

      {/* Deliverables Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deliverables</CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAddDeliverable(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Deliverable
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{deliverableCounts.pending || 0}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{deliverableCounts.in_progress || 0}</div>
              <div className="text-sm text-gray-500">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{deliverableCounts.completed || 0}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{deliverableCounts.delivered || 0}</div>
              <div className="text-sm text-gray-500">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{deliverableCounts.accepted || 0}</div>
              <div className="text-sm text-gray-500">Accepted</div>
            </div>
          </div>

          {/* Add Deliverable Form */}
          {showAddDeliverable && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-3">Add New Deliverable</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deliverable Name</label>
                  <Input
                    placeholder="e.g., System Architecture Document"
                    value={newDeliverable.name}
                    onChange={(e) => setNewDeliverable(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Textarea
                    placeholder="e.g., Complete system architecture and design specifications"
                    value={newDeliverable.description}
                    onChange={(e) => setNewDeliverable(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <Input
                    type="date"
                    value={newDeliverable.dueDate}
                    onChange={(e) => setNewDeliverable(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex space-x-2 mt-3">
                <Button
                  size="sm"
                  onClick={addDeliverable}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add Deliverable
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddDeliverable(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Deliverables List */}
          <div className="space-y-2">
            {deliverables.map((deliverable) => (
              <div key={deliverable.id} className="p-3 bg-white border rounded-lg">
                {editingDeliverable === deliverable.id ? (
                  // Edit Form
                  <div className="space-y-3">
                    <h4 className="font-medium">Edit Deliverable</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deliverable Name</label>
                        <Input
                          placeholder="e.g., System Architecture Document"
                          value={editingDeliverableData.name}
                          onChange={(e) => setEditingDeliverableData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <Textarea
                          placeholder="e.g., Complete system architecture and design specifications"
                          value={editingDeliverableData.description}
                          onChange={(e) => setEditingDeliverableData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <Select
                          value={editingDeliverableData.status}
                          onValueChange={(value) => setEditingDeliverableData(prev => ({ ...prev, status: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <Input
                          type="date"
                          value={editingDeliverableData.dueDate}
                          onChange={(e) => setEditingDeliverableData(prev => ({ ...prev, dueDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={saveEditDeliverable}>Save Changes</Button>
                      <Button size="sm" variant="outline" onClick={cancelEditDeliverable}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{deliverable.name}</div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(deliverable.status)}>
                          {deliverable.status.replace('_', ' ')}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline" onClick={() => startEditDeliverable(deliverable)}>
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setDeliverables(prev => prev.filter(d => d.id !== deliverable.id))
                            toast.success('Deliverable deleted')
                          }}>
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{deliverable.description}</div>
                    <div className="text-xs text-gray-500 mt-1">Due: {deliverable.dueDate}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
              <div className="text-xs text-green-600 mt-1">From time entries</div>
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
                              onClick={() => {
                                setMilestones(prev => prev.filter(m => m.id !== milestone.id))
                                toast.success('Milestone deleted')
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
                <p className="text-sm mt-2">Enter a quoted amount above and click "Generate Billing Info" to auto-create milestones.</p>
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

      {/* Labor Tracking Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actual Labor Tracking */}
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between mb-4">
              <div className="flex items-center gap-4">
                <CardTitle className="text-green-700">Actual Hours</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const endpoint = jobType === 'QUOTE'
                      ? `/api/quotes/${jobId}/hours/export`
                      : `/api/jobs/${jobId}/hours/export`
                    window.open(endpoint, '_blank')
                  }}
                  className="text-xs"
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  Export to Excel
                </Button>
              </div>
              <div className="flex items-baseline space-x-4">
                <div className="text-2xl font-bold text-green-600">
                  {laborCodeData.reduce((sum, lc) => sum + lc.actualHours, 0)}
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  ${laborCodeData.reduce((sum, lc) => sum + lc.actualCost, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Actual Labor Table */}
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
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Hours</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Rate</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {laborCodeData.map((lc) => (
                    <tr
                      key={lc.id}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setDrillDownLaborCode({ id: lc.id, name: lc.name })
                        setIsDrillDownOpen(true)
                      }}
                    >
                      <td className="py-2 px-3 font-mono text-xs">{lc.code}</td>
                      <td className="py-2 px-3 truncate" title={lc.name}>{lc.name}</td>
                      <td className="py-2 px-3 text-right font-medium">
                        {lc.actualHours.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600">
                        ${lc.rate.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-orange-600">
                        ${lc.actualCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quoted Labor Tracking */}
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between mb-4">
              <CardTitle className="text-blue-700">
                Quoted Hours
                {isECOMode && (
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    ECO Mode
                  </span>
                )}
              </CardTitle>
              <div className="flex items-baseline space-x-4">
                <div className="text-2xl font-bold text-blue-600">
                  {laborCodeData.reduce((sum, lc) => sum + lc.estimatedHours, 0)}
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  ${laborCodeData.reduce((sum, lc) => sum + lc.estimatedCost, 0).toLocaleString()}
                </div>
                {/* Submit ECO Button - Show for all jobs */}
                {!isECOMode && (
                  <SubmitECOModal
                    jobId={jobId}
                    jobNumber={jobNumber}
                    timeEntries={timeEntries.map(te => ({ ...te, totalHours: te.regularHours + te.overtimeHours }))}
                    laborCodes={laborCodes}
                    quotedLabor={quotedLabor}
                    onECOSubmitted={handleECOSubmitted}
                  />
                )}
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
                            if (!isJobLocked) {
                              const newHours = parseFloat(e.target.value) || 0
                              updateQuotedHours(lc.id, newHours)
                            }
                          }}
                          className={`w-full h-7 px-2 py-1 border rounded text-sm ${isJobLocked
                            ? 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed'
                            : 'border-gray-300'
                            }`}
                          min="0"
                          step="0.5"
                          placeholder="0"
                          disabled={isJobLocked}
                          title={isJobLocked ? 'Hours are locked after quote conversion. Use ECO to modify.' : 'Edit quoted hours'}
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

          {/* ECO Mode Controls */}
          {isECOMode && (
            <div className="border-t bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  <strong>ECO Changes:</strong> {Object.keys(ecoChanges).length} labor codes modified
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEcoChanges({})
                      setIsECOMode(false)
                      window.location.href = `/dashboard/jobs/${jobId}`
                    }}
                    className="text-sm"
                  >
                    Cancel ECO
                  </Button>
                  <Button
                    onClick={handleSubmitECO}
                    disabled={Object.keys(ecoChanges).length === 0}
                    className="text-sm bg-blue-600 hover:bg-blue-700"
                  >
                    Submit ECO Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>


      </div>

      {/* Bill of Materials - Full Width - Using BOMPartsTable component like BOM editor */}
      {bom && bom.parts.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-baseline justify-between mb-4">
                <CardTitle className="text-purple-700">Bill of Materials</CardTitle>
                <div className="flex items-baseline space-x-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {bom.parts.length} Parts
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    ${bom.parts.reduce((sum, p) => sum + p.customerPrice, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500 mb-4 italic">
                Note: Changes to BOM pricing do not affect the Parts Database, and Parts Database changes do not affect BOM pricing.
              </div>
              <BOMPartsTable
                bomId={bom.id}
                parts={bom.parts.map(part => ({
                  id: part.id,
                  bomId: bom.id,
                  partId: part.originalPart?.id || null,
                  partNumber: part.partNumber,
                  quantity: part.quantity,
                  purchasePrice: part.purchasePrice,
                  markupPercent: part.markupPercent,
                  customerPrice: part.customerPrice,
                  manufacturer: part.manufacturer,
                  description: part.description,
                  source: part.source || null,
                  notes: part.notes || null,
                  estimatedDelivery: part.estimatedDelivery || null,
                  status: part.status as 'HOLD' | 'ORDER' | 'PLACED' | 'HERE' | 'STOCK' | 'CUSTOMER_SUPPLIED',
                  originalPart: part.originalPart || undefined,
                }))}
                onPartUpdated={() => {
                  // Refresh the page to get updated BOM data
                  window.location.reload()
                }}
              />

              {/* Bulk Status Update */}
              <div className="mt-6">
                <BulkBOMUpdate
                  bomId={bom.id}
                  parts={bom.parts.map(part => ({
                    id: part.id,
                    partNumber: part.partNumber,
                    description: part.description,
                    status: part.status,
                    source: part.source,
                  }))}
                  onUpdated={() => {
                    window.location.reload()
                  }}
                />
              </div>

              {/* Summary Card */}
              <Card className="mt-6">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Parts</p>
                      <p className="text-2xl font-bold text-gray-900">{bom.parts.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${bom.parts.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Customer Price</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${bom.parts.reduce((sum, p) => sum + p.customerPrice, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drill Down Modal */}
      <LaborCodeDrillDownModal
        isOpen={isDrillDownOpen}
        onClose={() => setIsDrillDownOpen(false)}
        jobId={jobId}
        laborCodeId={drillDownLaborCode?.id || null}
        laborCodeName={drillDownLaborCode?.name || null}
        jobType={jobType as 'JOB' | 'QUOTE'}
      />
    </div>
  )
}


// BOM Row Component with inline editing
function BOMRow({ part, bomId }: { part: BOMPart; bomId: string }) {
  const [purchasePrice, setPurchasePrice] = useState<string>(part.purchasePrice.toString())
  const [markupPercent, setMarkupPercent] = useState<string>(part.markupPercent.toString())
  const [source, setSource] = useState(part.source || '')
  const [status, setStatus] = useState(part.status)
  const [estimatedDelivery, setEstimatedDelivery] = useState(part.estimatedDelivery ? part.estimatedDelivery.split('T')[0] : '')
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  // Calculate customer price from string inputs
  const purchasePriceNum = parseFloat(purchasePrice) || 0
  const markupPercentNum = parseFloat(markupPercent) || 0
  const customerPrice = purchasePriceNum * part.quantity * (1 + markupPercentNum / 100)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/boms/${bomId}/parts/${part.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchasePrice: purchasePriceNum,
          markupPercent: markupPercentNum,
          source: source || null,
          status,
          estimatedDelivery: estimatedDelivery || null,
        }),
      })

      if (response.ok) {
        toast.success('BOM part updated')
        // Use router.refresh() instead of window.location.reload() to avoid full page reload
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update BOM part')
      }
    } catch (error) {
      console.error('Error updating BOM part:', error)
      toast.error('An error occurred while updating the BOM part')
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges =
    purchasePriceNum !== part.purchasePrice ||
    markupPercentNum !== part.markupPercent ||
    source !== (part.source || '') ||
    status !== part.status ||
    estimatedDelivery !== (part.estimatedDelivery ? part.estimatedDelivery.split('T')[0] : '')

  const statusColors: Record<string, string> = {
    HOLD: 'bg-yellow-100 text-yellow-800',
    ORDER: 'bg-blue-100 text-blue-800',
    PLACED: 'bg-purple-100 text-purple-800',
    HERE: 'bg-green-100 text-green-800',
    STOCK: 'bg-gray-100 text-gray-800',
    CUSTOMER_SUPPLIED: 'bg-orange-100 text-orange-800',
  }

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all duration-150">
      <td className="py-1 px-2 font-medium font-mono text-[10px] min-w-[100px] truncate" title={part.partNumber}>{part.partNumber}</td>
      <td className="py-1 px-2 text-[10px] text-gray-600 truncate min-w-[150px]" title={part.description || ''}>{part.description || '-'}</td>
      <td className="py-1 px-2 text-center text-[10px] min-w-[50px]">{part.quantity}</td>
      <td className="py-1 px-2 text-[10px] text-gray-600 truncate min-w-[120px]" title={part.manufacturer}>{part.manufacturer}</td>
      <td className="py-1 px-2 min-w-[100px]">
        <Input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full text-[9px] h-5 px-1"
          placeholder="Source"
        />
      </td>
      <td className="py-1 px-2 min-w-[90px]">
        <Input
          type="text"
          inputMode="decimal"
          value={purchasePrice}
          onChange={(e) => {
            const val = e.target.value
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              setPurchasePrice(val)
            }
          }}
          onBlur={(e) => {
            const num = parseFloat(e.target.value)
            if (!isNaN(num) && num >= 0) {
              setPurchasePrice(num.toFixed(2))
            } else if (e.target.value === '') {
              setPurchasePrice('0.00')
            }
          }}
          className="w-full text-[9px] h-5 px-1 text-right"
          placeholder="0.00"
        />
      </td>
      <td className="py-1 px-2 min-w-[80px]">
        <Input
          type="text"
          inputMode="decimal"
          value={markupPercent}
          onChange={(e) => {
            const val = e.target.value
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              setMarkupPercent(val)
            }
          }}
          onBlur={(e) => {
            const num = parseFloat(e.target.value)
            if (!isNaN(num) && num >= 0) {
              setMarkupPercent(num.toString())
            } else if (e.target.value === '') {
              setMarkupPercent('0')
            }
          }}
          className="w-full text-[9px] h-5 px-1 text-right"
          placeholder="0"
        />
      </td>
      <td className="py-1 px-2 text-right font-medium text-green-600 text-[10px] min-w-[100px]">
        ${customerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="py-1 px-2 min-w-[100px]">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full text-[9px] h-5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HOLD">Hold</SelectItem>
            <SelectItem value="ORDER">Order</SelectItem>
            <SelectItem value="PLACED">Placed</SelectItem>
            <SelectItem value="HERE">Here</SelectItem>
            <SelectItem value="STOCK">Stock</SelectItem>
            <SelectItem value="CUSTOMER_SUPPLIED">Customer Supplied</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="py-1 px-2 min-w-[120px]">
        <Input
          type="date"
          value={estimatedDelivery}
          onChange={(e) => setEstimatedDelivery(e.target.value)}
          className="w-full text-[9px] h-5 px-1"
        />
      </td>
      <td className="py-1 px-2 min-w-[50px] text-center">
        {hasChanges && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving}
            className="h-5 w-5 p-0"
            title="Save changes"
          >
            <Save className="h-3 w-3" />
          </Button>
        )}
      </td>
    </tr>
  )
}
