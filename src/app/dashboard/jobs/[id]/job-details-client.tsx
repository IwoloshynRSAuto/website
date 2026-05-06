'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Clock, DollarSign, Calculator, RefreshCw, Save } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { SubmitECOModal } from '@/components/jobs/submit-eco-modal'
import { BulkBOMUpdate } from '@/components/jobs/bulk-bom-update'
import { JobProcurementSection } from '@/components/jobs/job-procurement-section'
import { MilestoneGanttView } from '@/components/jobs/milestone-gantt-view'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KanbanBoard } from '@/components/jobs/kanban-board'
import { LaborCodeDrillDownModal } from '@/components/jobs/labor-code-drill-down-modal'
import { computeTimeEntryCostsPlain } from '@/lib/timekeeping/time-entry-cost'
import { stripOtLaborCodeSuffix } from '@/lib/labor-codes/ot-code'
import { DeliverablesTimeline } from '@/components/tasks/deliverables-timeline'

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

type TaskCode = { id: string; code: string; description: string; category: string; isActive?: boolean }

type DeliverableTask = {
  id: string
  name: string
  description: string | null
  taskCode: string | null
  taskCodeDescription: string | null
  dueDate: string | null
  estimatedHours: number | null
}

function prefixFromTaskCode(code: string | null | undefined): 'PM' | 'AD' | 'SV' | 'OTHER' {
  const t = (code || '').trim().toUpperCase()
  const p = t.slice(0, 2)
  if (p === 'PM' || p === 'AD' || p === 'SV') return p
  return 'OTHER'
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
  /** Serialized cost snapshot when present */
  rate?: number | null
  regularCost?: number | null
  otCost?: number | null
  otMultiplierUsed?: number | null
  totalCost?: number | null
  user: {
    name: string | null
  } | null
}

/** Job card labor dollars — prefer DB snapshot; otherwise reg + OT using overtimePayFactorPerOtHour (see time-entry-cost). */
function entryLaborCost(entry: TimeEntry, otMultFallback: number): number {
  const snapshotTotal = entry.totalCost != null ? Number(entry.totalCost) : NaN
  if (Number.isFinite(snapshotTotal)) return snapshotTotal

  const rc = entry.regularCost != null ? Number(entry.regularCost) : NaN
  const oc = entry.otCost != null ? Number(entry.otCost) : NaN
  if (Number.isFinite(rc) && Number.isFinite(oc)) return rc + oc

  const phaseRate = entry.laborCode?.hourlyRate ?? 0
  const baseRate =
    entry.rate != null && Number.isFinite(Number(entry.rate)) ? Number(entry.rate) : phaseRate
  const mult =
    entry.otMultiplierUsed != null && Number.isFinite(Number(entry.otMultiplierUsed))
      ? Number(entry.otMultiplierUsed)
      : otMultFallback

  return computeTimeEntryCostsPlain({
    regularHours: entry.regularHours,
    overtimeHours: entry.overtimeHours,
    baseRate,
    otMultiplier: mult,
  }).totalCost
}

/** Hours stored without a linked phase code still count toward job totals */
const NO_PHASE_ROW_ID = '__no_labor_code__'

interface QuotedLabor {
  /** JobLaborEstimate row id (JOB only); used by schedule board. */
  id?: string
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
  /** Configured OT multiplier to use if an entry snapshot is missing. */
  otMultiplierFallback: number
}

export function JobDetailsClient({ jobId, jobNumber, laborCodes, timeEntries, quotedLabor, jobType, relatedQuoteId, users, bom, milestones: initialMilestones = [], otMultiplierFallback }: JobDetailsClientProps) {
  const { toast } = useToast()
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

    // Calculate actual hours and costs from time entries (roll WC/OT onto quoted WC row when present)
    timeEntries.forEach((entry) => {
      const totalHours = entry.regularHours + entry.overtimeHours
      if (totalHours <= 0) return

      let mappedId: string | null = null
      if (entry.laborCodeId && laborCodeMap.has(entry.laborCodeId)) {
        mappedId = entry.laborCodeId
      } else if (entry.laborCode?.code) {
        const baseCode = stripOtLaborCodeSuffix(entry.laborCode.code)
        const baseLc = laborCodes.find((lc) => lc.code.toUpperCase() === baseCode.toUpperCase())
        if (baseLc && laborCodeMap.has(baseLc.id)) {
          mappedId = baseLc.id
        }
      }

      if (!mappedId) {
        if (!laborCodeMap.has(NO_PHASE_ROW_ID)) {
          laborCodeMap.set(NO_PHASE_ROW_ID, {
            id: NO_PHASE_ROW_ID,
            code: '—',
            name: 'No phase linked',
            category: '',
            rate: 0,
            estimatedHours: 0,
            actualHours: 0,
            estimatedCost: 0,
            actualCost: 0,
            progress: 0,
          })
        }
        const row = laborCodeMap.get(NO_PHASE_ROW_ID)!
        const costDelta = entryLaborCost(entry, otMultiplierFallback)
        laborCodeMap.set(NO_PHASE_ROW_ID, {
          ...row,
          actualHours: row.actualHours + totalHours,
          actualCost: row.actualCost + costDelta,
        })
        return
      }

      const laborCode = laborCodeMap.get(mappedId as string)!
      const cost = entryLaborCost(entry, otMultiplierFallback)

      laborCodeMap.set(mappedId, {
        ...laborCode,
        actualHours: laborCode.actualHours + totalHours,
        actualCost: laborCode.actualCost + cost,
      })
    })

    // Calculate progress percentages
    laborCodeMap.forEach((lc, id) => {
      if (lc.estimatedHours > 0) {
        lc.progress = Math.round((lc.actualHours / lc.estimatedHours) * 100)
      }
    })

    return Array.from(laborCodeMap.values())
  }, [laborCodes, timeEntries, quotedHours, otMultiplierFallback])

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
        toast({ title: `ECO Change: Updated ${laborCode?.code} to ${hours} hours` })
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
          toast({ title: 'Failed to save quoted hours', variant: 'destructive' })
        }

        const laborCode = laborCodes.find(lc => lc.id === laborCodeId)
        toast({ title: `Updated quoted hours for ${laborCode?.code} to ${hours}` })
      }
    } catch {
      toast({ title: 'Failed to update quoted hours', variant: 'destructive' })
    }
  }

  const handleSubmitECO = async () => {
    if (Object.keys(ecoChanges).length === 0) {
      toast({ title: 'No changes to submit', variant: 'destructive' })
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
        toast({ title: 'ECO submitted successfully' })
        setEcoSubmitted(true)
        window.location.reload()
      } else {
        const error = await response.json()
        toast({ title: 'Failed to submit ECO', description: error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to submit ECO', variant: 'destructive' })
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
      toast({ title: 'Please fill in milestone name and percentage', variant: 'destructive' })
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
        toast({ title: 'Milestone added successfully' })
        window.location.reload()
      } else {
        const error = await response.json()
        toast({ title: 'Failed to add milestone', description: error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to add milestone', variant: 'destructive' })
    }
  }

  const addDeliverable = () => {
    if (!newDeliverable.name || !newDeliverable.description) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' })
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
    toast({ title: 'Deliverable added successfully' })
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
      toast({ title: 'Please fill in milestone name and percentage', variant: 'destructive' })
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
        toast({ title: 'Milestone updated successfully' })
        window.location.reload()
      } else {
        const error = await response.json()
        toast({ title: 'Failed to update milestone', description: error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to update milestone', variant: 'destructive' })
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
      toast({ title: 'Please fill in all required fields', variant: 'destructive' })
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
    toast({ title: 'Deliverable updated successfully' })
  }

  const cancelEditDeliverable = () => {
    setEditingDeliverable(null)
    setEditingDeliverableData({ name: '', description: '', status: 'pending', dueDate: '' })
  }

  const updateLaborCodeHours = (laborCodeId: string, hours: number) => {
    toast({ title: `Updated hours for labor code ${laborCodeId}: ${hours}` })
  }

  const refreshMilestone = (milestoneId: string) => {
    setMilestones(prev => prev.map(m => {
      if (m.id === milestoneId) {
        const newAmount = (quotedAmount * m.percentage) / 100
        return { ...m, amount: newAmount }
      }
      return m
    }))
    toast({ title: 'Milestone amount refreshed' })
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
        toast({ title: 'Milestone deleted' })
        window.location.reload()
      } else {
        const error = await response.json()
        toast({ title: 'Failed to delete milestone', description: error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to delete milestone', variant: 'destructive' })
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

  // Task-code deliverables (PM/AD/SV)
  const [taskCodes, setTaskCodes] = useState<TaskCode[]>([])
  const [deliverableTasks, setDeliverableTasks] = useState<DeliverableTask[]>([])
  const [deliverableTasksLoading, setDeliverableTasksLoading] = useState(false)
  const [deliverablesFilter, setDeliverablesFilter] = useState('')
  const [selectedDeliverableTaskId, setSelectedDeliverableTaskId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/task-codes')
        if (!res.ok) return
        const result = await res.json()
        const data = result.data || (Array.isArray(result) ? result : [])
        setTaskCodes(Array.isArray(data) ? data : [])
      } catch {
        setTaskCodes([])
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      setDeliverableTasksLoading(true)
      try {
        const res = await fetch(`/api/jobs/${jobId}/tasks`)
        const result = await res.json().catch(() => ({}))
        if (!res.ok || result.success === false) {
          setDeliverableTasks([])
          return
        }
        const rows = Array.isArray(result.data) ? (result.data as DeliverableTask[]) : []
        setDeliverableTasks(rows.filter((t) => !!t.taskCode))
      } catch {
        setDeliverableTasks([])
      } finally {
        setDeliverableTasksLoading(false)
      }
    })()
  }, [jobId])

  const deliverableTasksByCode = useMemo(() => {
    const m = new Map<string, DeliverableTask>()
    for (const d of deliverableTasks) {
      const code = (d.taskCode || '').trim()
      if (code) m.set(code, d)
    }
    return m
  }, [deliverableTasks])

  const deliverableRollups = useMemo(() => {
    const totals: Record<string, number> = { PM: 0, AD: 0, SV: 0 }
    for (const d of deliverableTasks) {
      const p = prefixFromTaskCode(d.taskCode)
      if (p === 'PM' || p === 'AD' || p === 'SV') totals[p] += Number(d.estimatedHours || 0)
    }
    return totals
  }, [deliverableTasks])

  const filteredTaskCodes = useMemo(() => {
    const q = deliverablesFilter.trim().toLowerCase()
    const list = taskCodes.filter((t) => t.isActive !== false)
    if (!q) return list
    return list.filter((t) => t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }, [taskCodes, deliverablesFilter])

  async function includeDeliverableCode(c: TaskCode) {
    setDeliverableTasksLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${c.code} ${c.description}`,
          status: 'BACKLOG',
          taskCode: c.code,
          taskCodeDescription: c.description,
          dueDate: null,
          estimatedHours: 0,
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      const row = result.data as DeliverableTask
      setDeliverableTasks((prev) => [...prev, row])
      setSelectedDeliverableTaskId(row.id)
    } catch (e) {
      toast({
        title: 'Could not add deliverable',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setDeliverableTasksLoading(false)
    }
  }

  async function updateDeliverableTask(taskId: string, updates: Partial<DeliverableTask>) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      const row = result.data as DeliverableTask
      setDeliverableTasks((prev) => prev.map((t) => (t.id === row.id ? row : t)))
    } catch (e) {
      toast({
        title: 'Could not update deliverable',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    }
  }

  async function removeDeliverableTask(taskId: string) {
    setDeliverableTasksLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/tasks/${taskId}`, { method: 'DELETE' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      setDeliverableTasks((prev) => prev.filter((t) => t.id !== taskId))
      setSelectedDeliverableTaskId((cur) => (cur === taskId ? null : cur))
    } catch (e) {
      toast({
        title: 'Could not remove deliverable',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setDeliverableTasksLoading(false)
    }
  }

  return (
    <div className="space-y-8 w-full">
      {/* Task Kanban Board - Above Deliverables */}
      <KanbanBoard
        jobId={jobType === 'JOB' ? jobId : undefined}
        quoteId={jobType === 'QUOTE' ? jobId : undefined}
        jobType={jobType as 'JOB' | 'QUOTE'}
        users={users}
      />

      <details className="group rounded-lg border bg-card" open>
        <summary className="cursor-pointer select-none px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section</p>
            <p className="text-base font-semibold">Deliverables</p>
          </div>
          <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
          <span className="text-xs text-muted-foreground hidden group-open:inline">Hide</span>
        </summary>
        <div className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">PM hours</div>
              <div className="text-lg font-semibold tabular-nums">{deliverableRollups.PM.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">AD hours</div>
              <div className="text-lg font-semibold tabular-nums">{deliverableRollups.AD.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">SV hours</div>
              <div className="text-lg font-semibold tabular-nums">{deliverableRollups.SV.toFixed(2)}</div>
            </div>
          </div>

          <DeliverablesTimeline
            tasks={deliverableTasks.map((d) => ({
              ...d,
              groupCode: d.laborCodeId ? (laborCodes.find((lc) => lc.id === d.laborCodeId)?.code || '').slice(0, 2) : null,
            }))}
            selectedTaskId={selectedDeliverableTaskId}
            onSelectTaskId={(id) => setSelectedDeliverableTaskId(id)}
          />

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="job-deliverables-filter">Search</Label>
              <Input
                id="job-deliverables-filter"
                value={deliverablesFilter}
                onChange={(e) => setDeliverablesFilter(e.target.value)}
                placeholder="Search codes or descriptions…"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {deliverableTasksLoading ? 'Updating…' : `${deliverableTasks.length} selected`}
            </div>
          </div>

          <div className="overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2 w-[220px]">Code</th>
                  <th className="text-left font-medium px-3 py-2 min-w-[320px]">Description</th>
                  <th className="text-left font-medium px-3 py-2 w-[140px]">Due</th>
                  <th className="text-left font-medium px-3 py-2 w-[140px]">Hours</th>
                  <th className="px-3 py-2 w-[90px]" />
                </tr>
              </thead>
              <tbody>
                {filteredTaskCodes.map((c) => {
                  const included = deliverableTasksByCode.get(c.code)
                  const isSelected = included && included.id === selectedDeliverableTaskId
                  return (
                    <tr key={c.id} className={isSelected ? 'bg-muted/20' : ''}>
                      <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                      <td className="px-3 py-2">{c.description}</td>
                      <td className="px-3 py-2">
                        {included ? (
                          <Input
                            type="date"
                            className="h-8"
                            value={included.dueDate ? included.dueDate.split('T')[0] : ''}
                            onChange={(e) => void updateDeliverableTask(included.id, { dueDate: e.target.value || null })}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {included ? (
                          <Input
                            type="number"
                            min={0}
                            step="0.25"
                            className="h-8"
                            value={included.estimatedHours ?? 0}
                            onChange={(e) => void updateDeliverableTask(included.id, { estimatedHours: e.target.value === '' ? 0 : Number(e.target.value) })}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {included ? (
                          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void removeDeliverableTask(included.id)}>
                            Remove
                          </Button>
                        ) : (
                          <Button type="button" variant="secondary" size="sm" className="h-8" onClick={() => void includeDeliverableCode(c)}>
                            Add
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      {/* Old deliverables + quoted labor schedule removed */}

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
                    <Label className="block text-gray-700 mb-1">Milestone Name</Label>
                    <Input
                      placeholder="e.g., Initial Design Review"
                      value={newMilestone.name}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="block text-gray-700 mb-1">Percentage (%)</Label>
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
                    <Label className="block text-gray-700 mb-1">Due Date (Optional)</Label>
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
                                toast({ title: 'Milestone deleted' })
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
                      <Label className="block text-gray-700 mb-1">Milestone Name</Label>
                      <Input
                        placeholder="e.g., Initial Design Review"
                        value={editingMilestoneData.name}
                        onChange={(e) => setEditingMilestoneData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="block text-gray-700 mb-1">Percentage (%)</Label>
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
                      <Label className="block text-gray-700 mb-1">Due Date (Optional)</Label>
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

      {/* Labor Tracking Comparison — equal-width columns, matched headers & table geometry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Actual Labor Tracking */}
        <Card className="flex min-h-0 min-w-0 w-full flex-col overflow-hidden">
          <CardHeader className="border-b pb-4">
            <div className="flex min-h-[5.5rem] flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
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
              <div className="flex shrink-0 items-baseline gap-4">
                <div className="text-2xl font-bold text-green-600 tabular-nums">
                  {laborCodeData.reduce((sum, lc) => sum + lc.actualHours, 0)}
                </div>
                <div className="text-2xl font-bold text-orange-600 tabular-nums">
                  ${laborCodeData.reduce((sum, lc) => sum + lc.actualCost, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="min-h-[280px] flex-1 overflow-x-auto px-4 pb-4 pt-0">
              <table className="w-full min-w-[520px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Code</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-700">Hours</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-700">Rate</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-700">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {laborCodeData.map((lc) => (
                    <tr
                      key={lc.id}
                      className={`h-12 border-b align-middle transition-colors last:border-0 ${
                        lc.id === NO_PHASE_ROW_ID
                          ? 'bg-amber-50/60'
                          : 'cursor-pointer hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (lc.id === NO_PHASE_ROW_ID) return
                        setDrillDownLaborCode({ id: lc.id, name: lc.name })
                        setIsDrillDownOpen(true)
                      }}
                    >
                      <td className="px-2 py-2 font-mono text-xs">{lc.code}</td>
                      <td className="max-w-0 truncate px-2 py-2" title={lc.name}>
                        {lc.name}
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-medium tabular-nums">
                        {lc.actualHours.toFixed(1)}
                      </td>
                      <td className="px-2 py-2 text-right text-sm text-gray-600 tabular-nums">
                        ${lc.rate.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-medium tabular-nums text-orange-600">
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
        <Card className="flex min-h-0 min-w-0 w-full flex-col overflow-hidden">
          <CardHeader className="border-b pb-4">
            <div className="flex min-h-[5.5rem] flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <CardTitle className="text-blue-700">
                  Quoted Hours
                  {isECOMode && (
                    <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-sm text-blue-800">ECO Mode</span>
                  )}
                </CardTitle>
                {!isECOMode && (
                  <SubmitECOModal
                    jobId={jobId}
                    jobNumber={jobNumber}
                    timeEntries={timeEntries.map((te) => ({ ...te, totalHours: te.regularHours + te.overtimeHours }))}
                    laborCodes={laborCodes}
                    quotedLabor={quotedLabor}
                    onECOSubmitted={handleECOSubmitted}
                  />
                )}
              </div>
              <div className="flex shrink-0 items-baseline gap-4">
                <div className="text-2xl font-bold text-blue-600 tabular-nums">
                  {laborCodeData.reduce((sum, lc) => sum + lc.estimatedHours, 0)}
                </div>
                <div className="text-2xl font-bold text-purple-600 tabular-nums">
                  ${laborCodeData.reduce((sum, lc) => sum + lc.estimatedCost, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="min-h-[280px] flex-1 overflow-x-auto px-4 pb-4 pt-0">
              <table className="w-full min-w-[520px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Code</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-700">Hours</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-700">Rate</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-700">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {laborCodeData.map((lc) => (
                    <tr key={lc.id} className="h-12 border-b align-middle hover:bg-gray-50">
                      <td className="px-2 py-2 font-mono text-xs">{lc.code}</td>
                      <td className="max-w-0 truncate px-2 py-2" title={lc.name}>
                        {lc.name}
                      </td>
                      <td className="px-1 py-1.5 text-right">
                        <input
                          type="number"
                          value={lc.estimatedHours}
                          onChange={(e) => {
                            if (!isJobLocked) {
                              const newHours = parseFloat(e.target.value) || 0
                              updateQuotedHours(lc.id, newHours)
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`h-8 w-full min-w-0 rounded border px-2 text-right text-sm tabular-nums shadow-sm ${
                            isJobLocked
                              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-600'
                              : 'border-gray-300 bg-white'
                          }`}
                          min="0"
                          step="0.5"
                          placeholder="0"
                          disabled={isJobLocked}
                          title={isJobLocked ? 'Hours are locked after quote conversion. Use ECO to modify.' : 'Edit quoted hours'}
                        />
                      </td>
                      <td className="px-2 py-2 text-right text-sm text-gray-600 tabular-nums">
                        ${lc.rate.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right text-sm tabular-nums">
                        <span
                          className={
                            lc.estimatedCost > 0
                              ? 'font-medium text-blue-600'
                              : 'text-gray-400'
                          }
                        >
                          ${lc.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
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
              <p className="text-sm text-muted-foreground">{bom.parts.length} parts attached to this BOM.</p>

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

      <JobProcurementSection jobId={jobId} />

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
        toast({ title: 'BOM part updated' })
        router.refresh()
      } else {
        const error = await response.json()
        toast({ title: 'Failed to update BOM part', description: error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'An error occurred while updating the BOM part', variant: 'destructive' })
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
