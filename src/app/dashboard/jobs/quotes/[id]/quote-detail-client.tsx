'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, isValid } from 'date-fns'
import { Briefcase, Building2, Calendar, DollarSign, FileText, Loader2, Save, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { DeliverablesTimeline } from '@/components/tasks/deliverables-timeline'

interface LaborEstimate {
  id: string
  discipline: string
  estimatedHours: number
}

interface Revision {
  id: string
  revisionNumber: number
  notes: string | null
  createdAt: string
  createdBy?: { id: string; name: string | null; email: string | null } | null
  laborEstimates: LaborEstimate[]
}

function toInputDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isValid(d) ? format(d, 'yyyy-MM-dd') : ''
}

function formatDisplayDate(iso: string | null | undefined, pattern: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isValid(d) ? format(d, pattern) : '—'
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description: string | null
  status: string
  amount: number
  validUntil: string | null
  createdAt: string
  updatedAt: string
  paymentTerms: string | null
  estimatedHours: number | null
  hourlyRate: number | null
  customer: { id: string; name: string; email: string | null; phone: string | null } | null
  convertedJob: { id: string; jobNumber: string; title: string } | null
  revisions: Revision[]
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-700',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

interface Props {
  quote: Quote
}

type CustomerOption = { id: string; name: string }

type TaskCode = { id: string; code: string; description: string; category: string }

type DeliverableTask = {
  id: string
  name: string
  description: string | null
  taskCode: string | null
  taskCodeDescription: string | null
  dueDate: string | null
  estimatedHours: number | null
  laborCodeId?: string | null
}

function prefixFromTaskCode(code: string | null | undefined): 'PM' | 'AD' | 'SV' | 'OTHER' {
  const t = (code || '').trim().toUpperCase()
  const p = t.slice(0, 2)
  if (p === 'PM' || p === 'AD' || p === 'SV') return p
  return 'OTHER'
}

function bestLaborCodeIdForDeliverable(
  taskCode: string | null | undefined,
  desc: string | null | undefined,
  phaseCodes: Array<{ id: string; code: string; name: string }>
): string | null {
  const c = String(taskCode || '').trim().toUpperCase()
  const d = String(desc || '').trim().toUpperCase()

  const byExactOrPrefix = (preferred: string[]) => {
    const pref = preferred.map((x) => x.trim().toUpperCase()).filter(Boolean)
    for (const p of pref) {
      const exact = phaseCodes.find((x) => String(x.code || '').trim().toUpperCase() === p)
      if (exact) return exact.id
    }
    for (const p of pref) {
      const starts = phaseCodes.find((x) => String(x.code || '').trim().toUpperCase().startsWith(p))
      if (starts) return starts.id
    }
    for (const p of pref) {
      const inName = phaseCodes.find((x) => String(x.name || '').trim().toUpperCase().includes(p))
      if (inName) return inName.id
    }
    return null
  }

  // Quoting / shipping / training / travel / admin
  if (d.includes('QUOTE')) return byExactOrPrefix(['QT'])
  if (d.includes('SHIPPING') || d.includes('RECEIVING')) return byExactOrPrefix(['SR'])
  if (d.includes('TRAIN')) return byExactOrPrefix(['TRN'])
  if (d.includes('TRAVEL')) return byExactOrPrefix(['TR'])
  if (d.includes('ADMIN')) return byExactOrPrefix(['AD'])

  // Mechanical Engineering
  if (d.includes('SKID') || d.includes('MECHANICAL') || d.includes('PIPING') || d.includes('BOM') || d.includes('PNEUMATIC')) {
    return byExactOrPrefix(['ME', 'MECH', 'MECHANICAL'])
  }

  // Electrical Engineering
  if (d.includes('ELECTRICAL') || d.includes('SCHEMATIC') || d.includes('ELECTRICAL CAD') || d.includes('E-CAD') || d.includes('E CAD')) {
    return byExactOrPrefix(['EE', 'ELEC', 'ELECTRICAL'])
  }

  // Controls Engineering (per your list: PLC/HMI belong to CD)
  if (d.includes('PLC') || d.includes('HMI') || d.includes('CONTROLS') || d.includes('I/O')) {
    return byExactOrPrefix(['CD', 'CONTROLS'])
  }

  // Panel build / fabrication / welding
  if (d.includes('PANEL') || d.includes('ENCLOSURE')) return byExactOrPrefix(['PB'])
  if (d.includes('FAB') || d.includes('FABRICATION')) return byExactOrPrefix(['FB'])
  if (d.includes('WELD')) return byExactOrPrefix(['WD'])

  // Machining buckets (best-effort)
  if (d.includes('WATERJET')) return byExactOrPrefix(['WJ'])
  if (d.includes('VERTICAL MILL')) return byExactOrPrefix(['VM', 'VL'])
  if (d.includes('HORIZONTAL MILL')) return byExactOrPrefix(['HM'])
  if (d.includes('SWISS')) return byExactOrPrefix(['SL'])
  if (d.includes('CNC LATHE')) return byExactOrPrefix(['CL'])
  if (d.includes('MANUAL')) return byExactOrPrefix(['MM'])
  if (d.includes('MACHIN')) return byExactOrPrefix(['MS'])

  // Default by family code
  if (c.startsWith('PM')) return byExactOrPrefix(['PM'])
  if (c.startsWith('AD')) return byExactOrPrefix(['AD'])
  if (c.startsWith('SV')) return byExactOrPrefix(['SV'])

  // Final fallback: no default
  return null
}

const RS_STANDARD_DELIVERABLES: Array<{ code: string; description: string; category: string }> = [
  { code: 'PM010-0000', description: 'PM010 Pre-Project Sales', category: 'PM' },
  { code: 'PM010-0100', description: 'PROJECT QUOTATION', category: 'PM' },
  { code: 'PM010-0200', description: 'ASSIGN NUMBER, DATE & STATUS', category: 'PM' },
  { code: 'PM010-0300', description: 'FILE QUOTATION IN QUOTE BOOK', category: 'PM' },
  { code: 'PM010-0400', description: 'OPEN QUOTE FILE BACKUP', category: 'PM' },
  { code: 'PM010-0500', description: 'QUOTE BASIC DATA REPORT', category: 'PM' },
  { code: 'PM020-0000', description: 'PM020 Order Entry', category: 'PM' },
  { code: 'PM020-0100', description: 'ANALYZE PURCHASE ORDER', category: 'PM' },
  { code: 'PM020-0200', description: 'CONTRACT INITIATE', category: 'PM' },
  { code: 'PM020-0300', description: 'ASSIGN JOB NUMBER', category: 'PM' },
  { code: 'PM020-0400', description: 'INVOICE DOWN PAYMENT', category: 'PM' },
  { code: 'PM020-0500', description: 'COMPLETE JOB REFERENCE SHEET', category: 'PM' },
  { code: 'PM020-0600', description: 'BUILD WIP FILE', category: 'PM' },
  { code: 'PM020-0700', description: 'SET UP JOB BOOK', category: 'PM' },
  { code: 'PM020-0800', description: 'CREATE OPEN JOB FILE', category: 'PM' },
  { code: 'PM020-0900', description: 'ASSIGN PROJECT MANAGER', category: 'PM' },
  { code: 'PM020-1000', description: 'TRANSFER JOB BOOK TO ENGINEERING', category: 'PM' },
  { code: 'PM030-0000', description: 'PM030 Project Management', category: 'PM' },
  { code: 'PM030-0100', description: 'PROJECT REVIEW COMMITTEE ASSIGNS PM', category: 'PM' },
  { code: 'PM030-0200', description: 'PROJECT MANAGER ASSUMES RESPONSIBILITY', category: 'PM' },
  { code: 'PM030-0300', description: 'DEVELOP PROJECT PLAN', category: 'PM' },
  { code: 'PM030-0400', description: 'HOLD KICK-OFF MEETING', category: 'PM' },
  { code: 'PM030-0500', description: 'CONDUCT PERIODIC PROJECT UPDATES', category: 'PM' },
  { code: 'PM040-0000', description: 'PM040 Functional Description', category: 'PM' },
  { code: 'PM040-0100', description: 'GENERATE FUNCTIONAL DESCRIPTION', category: 'PM' },
  { code: 'PM040-0200', description: 'APPROVALS OF FUNCTIONAL DESCRIPTION', category: 'PM' },
  { code: 'PM040-0300', description: 'RECEIVE ACCEPTANCE & INVOICE CUSTOMER', category: 'PM' },
  { code: 'PM050-0000', description: 'PM050 Process Design & Development', category: 'PM' },
  { code: 'PM050-0100', description: 'PROCESS & INSTRUMENT DRAWING', category: 'PM' },
  { code: 'PM050-0101', description: 'INVOICE CUSTOMER UPON DELIVERY OF P&ID', category: 'PM' },
  { code: 'PM050-0200', description: 'PRELIMINARY BOM', category: 'PM' },
  { code: 'PM050-0201', description: 'ORDER LONG LEAD ITEMS', category: 'PM' },
  { code: 'PM050-0300', description: 'PM050-0300 Mechanical Design', category: 'PM' },
  { code: 'PM050-0310', description: 'EQUIPMENT SIZING', category: 'PM' },
  { code: 'PM050-0320', description: 'ORDER MECHANICAL EQUIPMENT', category: 'PM' },
  { code: 'PM050-0330', description: 'SKID DESIGN', category: 'PM' },
  { code: 'PM050-0340', description: 'SKID CAD', category: 'PM' },
  { code: 'PM050-0350', description: 'PLANT PROCESS PIPING DESIGN', category: 'PM' },
  { code: 'PM050-0360', description: 'PLANT PROCESS PIPING CAD', category: 'PM' },
  { code: 'PM050-0370', description: 'PIPING SCHEDULE', category: 'PM' },
  { code: 'PM050-0380', description: 'DESIGN APPROVAL', category: 'PM' },
  { code: 'PM050-0390', description: 'FINAL MECHANICAL BILL OF MATERIALS', category: 'PM' },
  { code: 'PM050-0395', description: 'FABRICATION BID', category: 'PM' },
  { code: 'PM060-0000', description: 'PM060 Controls Design & Implementation', category: 'PM' },
  { code: 'PM060-0100', description: 'REVIEW FDD and P&ID', category: 'PM' },
  { code: 'PM060-0200', description: 'ASSIGN I/O and GENERATE DRAWING', category: 'PM' },
  { code: 'PM060-0300', description: 'ASSIGN EQUIPMENT IDENTIFIER (IDF)', category: 'PM' },
  { code: 'PM060-0400', description: 'ELECTRICAL SCHEMATIC DESIGN', category: 'PM' },
  { code: 'PM060-0500', description: 'FIELD DESIGN and CAD', category: 'PM' },
  { code: 'PM060-0600', description: 'CONDUIT SCHEDULE', category: 'PM' },
  { code: 'PM060-0700', description: 'ASSEMBLY LAYOUT', category: 'PM' },
  { code: 'PM060-0800', description: 'ELECTRICAL CAD', category: 'PM' },
  { code: 'PM060-0900', description: 'PNEUMATIC DESIGN and CAD', category: 'PM' },
  { code: 'PM060-1000', description: 'ELECTRICAL DESIGN APPROVAL', category: 'PM' },
  { code: 'PM060-1100', description: 'FINAL ELECTRICAL BOM', category: 'PM' },
  { code: 'PM060-1200', description: 'FINALIZE PURCHASING', category: 'PM' },
  { code: 'PM070-0000', description: 'PM070 Software Design & Implementation', category: 'PM' },
  { code: 'PM070-0100', description: 'SOFTWARE KICK-OFF MEETING', category: 'PM' },
  { code: 'PM070-0200', description: 'ORDER SOFTWARE', category: 'PM' },
  { code: 'PM070-0300', description: 'PLC MEMORY MAPPING & PROGRAM LAYOUT', category: 'PM' },
  { code: 'PM070-0400', description: 'GENERATE DATABASE', category: 'PM' },
  { code: 'PM070-0500', description: 'HMI SCREEN DEVELOPMENT', category: 'PM' },
  { code: 'PM070-0600', description: 'SUPERVISORY COMPUTER DEVELOPMENT', category: 'PM' },
  { code: 'PM070-0700', description: 'PLC DEVELOPMENT', category: 'PM' },
  { code: 'PM070-0800', description: 'MODULE LEVEL TESTING', category: 'PM' },
  { code: 'PM080-0000', description: 'PM080 Fabrication & Assembly', category: 'PM' },
  { code: 'PM080-0100', description: 'ENCLOSURE WIRING & ASSEMBLY', category: 'PM' },
  { code: 'PM080-0110', description: 'Delivery of Panel Material', category: 'PM' },
  { code: 'PM080-0120', description: 'Panel Layout', category: 'PM' },
  { code: 'PM080-0130', description: 'Panel Assembly & Wiring', category: 'PM' },
  { code: 'PM080-0140', description: 'Panel Testing', category: 'PM' },
  { code: 'PM080-0150', description: 'Certification of Panel Completion', category: 'PM' },
  { code: 'PM080-0200', description: 'SKID FABRICATION', category: 'PM' },
  { code: 'PM080-0210', description: 'Delivery of Skid Material', category: 'PM' },
  { code: 'PM080-0220', description: 'Skid Layout', category: 'PM' },
  { code: 'PM080-0230', description: 'Skid Assembly', category: 'PM' },
  { code: 'PM080-0240', description: 'Skid Testing', category: 'PM' },
  { code: 'PM080-0250', description: 'Certification of Skid Completion', category: 'PM' },
  { code: 'PM090-0000', description: 'PM090 Integration & Factory Acceptance Test (FAT)', category: 'PM' },
  { code: 'PM090-0100', description: 'SYSTEM COMPONENT INTEGRATION', category: 'PM' },
  { code: 'PM090-0110', description: 'CONTROL INTEGRATION', category: 'PM' },
  { code: 'PM090-0120', description: 'SOFTWARE INTEGRATION TEST', category: 'PM' },
  { code: 'PM090-0200', description: 'FACTORY ACCEPTANCE TEST (FAT)', category: 'PM' },
  { code: 'PM090-0300', description: 'SHIP EQUIPMENT TO CUSTOMER SITE', category: 'PM' },
  { code: 'PM100-0000', description: 'PM100 Installation', category: 'PM' },
  { code: 'PM100-0100', description: 'ON-SITE RECEIVING, UNLOADING & SET-UP', category: 'PM' },
  { code: 'PM100-0200', description: 'PERIODIC CONTRACTOR REVIEW MEETINGS', category: 'PM' },
  { code: 'PM100-0300', description: 'FIELD PIPING SUPERVISION', category: 'PM' },
  { code: 'PM100-0400', description: 'FIELD MECHANICAL INSTALLATION SUPERVISION', category: 'PM' },
  { code: 'PM100-0500', description: 'FIELD WIRING SUPERVISION', category: 'PM' },
  { code: 'PM100-0600', description: 'FIELD SOFTWARE INSTALLATION SUPERVISION', category: 'PM' },
  { code: 'PM100-0700', description: 'I/O LOOP CHECK', category: 'PM' },
  { code: 'PM100-0800', description: 'CALIBRATION', category: 'PM' },
  { code: 'PM110-0000', description: 'PM110 Commissioning and Final Acceptance', category: 'PM' },
  { code: 'PM110-0100', description: 'LOAD ALL APPLICATION SOFTWARE', category: 'PM' },
  { code: 'PM110-0200', description: 'VERIFY INTEGRATION OF SYSTEM', category: 'PM' },
  { code: 'PM110-0300', description: 'PERFORM SITE ACCEPTANCE TEST (SAT)', category: 'PM' },
  { code: 'PM110-0400', description: 'MODIFY SYSTEM and RE-TEST', category: 'PM' },
  { code: 'PM110-0500', description: 'START COMMERCIAL PRODUCTION', category: 'PM' },
  { code: 'PM110-0600', description: 'OBTAIN PERFORMANCE TEST CERTIFICATE', category: 'PM' },
  { code: 'PM110-0700', description: 'OBTAIN CUSTOMER TAKE-OVER CERTIFICATE', category: 'PM' },
  { code: 'PM110-0800', description: 'GENERATE PUNCH LIST', category: 'PM' },
  { code: 'PM110-0900', description: 'GENERATE COMMISSIONING INVOICE', category: 'PM' },
  { code: 'PM110-1000', description: 'MODIFY DRAWING PKG & APPLICATION SOFTWARE', category: 'PM' },
  { code: 'PM120-0000', description: 'PM120 Training', category: 'PM' },
  { code: 'PM120-0100', description: 'ESTABLISH TRAINING SCHEDULE', category: 'PM' },
  { code: 'PM120-0200', description: 'PRODUCTION TRAINING', category: 'PM' },
  { code: 'PM120-0300', description: 'SANITATION TRAINING', category: 'PM' },
  { code: 'PM120-0400', description: 'MAINTENANCE TRAINING', category: 'PM' },
  { code: 'PM130-0000', description: 'PM130 Documentation', category: 'PM' },
  { code: 'PM130-0100', description: 'PROVIDE FINAL DOCUMENTATION', category: 'PM' },
  { code: 'PM130-0200', description: 'GENERATE FINAL DOCUMENTATION INVOICE', category: 'PM' },
  { code: 'PM140-0000', description: 'PM140 Warranty', category: 'PM' },
  { code: 'PM140-0100', description: 'OBSERVATIONS', category: 'PM' },
  { code: 'PM140-0200', description: 'SCENARIO OF ACTION', category: 'PM' },
  { code: 'PM140-0300', description: 'WARRANTY MAINTENANCE', category: 'PM' },
  { code: 'SV010-0000', description: 'SV010 Service', category: 'SV' },
  { code: 'SV010-0100', description: 'ON-SITE SERVICE', category: 'SV' },
  { code: 'SV010-0200', description: 'REMOTE SERVICE', category: 'SV' },
  { code: 'AD900-0000', description: 'AD900 Administrative', category: 'AD' },
  { code: 'AD900-0100', description: 'ADMINISTRATIVE TIME (NOC)', category: 'AD' },
  { code: 'AD900-0200', description: 'SALES ASSISTANCE', category: 'AD' },
  { code: 'AD900-0300', description: 'EMPLOYEE TRAVEL TIME - BILLABLE', category: 'AD' },
  { code: 'AD900-0350', description: 'EMPLOYEE AIRLINE FARE', category: 'AD' },
  { code: 'AD900-0370', description: 'EMPLOYEE TRAVEL/LIVING EXPENSE LOCAL', category: 'AD' },
  { code: 'AD900-0380', description: 'EMPLOYEE TRAVEL/LIVING EXPENSE REMOTE', category: 'AD' },
]

export function QuoteDetailClient({ quote }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [taskCodes, setTaskCodes] = useState<TaskCode[]>([])
  const [phaseCodes, setPhaseCodes] = useState<Array<{ id: string; code: string; name: string; hourlyRate?: number }>>([])
  const [deliverables, setDeliverables] = useState<DeliverableTask[]>([])
  const [deliverablesLoading, setDeliverablesLoading] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const [title, setTitle] = useState(quote.title)
  const [description, setDescription] = useState(quote.description || '')
  const [amount, setAmount] = useState(String(quote.amount ?? 0))
  const [customerId, setCustomerId] = useState<string>(quote.customer?.id || '')
  const [validUntil, setValidUntil] = useState(() => toInputDate(quote.validUntil))
  const [paymentTerms, setPaymentTerms] = useState(quote.paymentTerms || '')
  // Estimated hours + hourly rate removed from UI (kept in DB for future costing needs)

  useEffect(() => {
    setTitle(quote.title)
    setDescription(quote.description || '')
    setAmount(String(quote.amount ?? 0))
    setCustomerId(quote.customer?.id || '')
    setValidUntil(toInputDate(quote.validUntil))
    setPaymentTerms(quote.paymentTerms || '')
  }, [
    quote.id,
    quote.updatedAt,
    quote.title,
    quote.description,
    quote.amount,
    quote.customer?.id,
    quote.validUntil,
    quote.paymentTerms,
  ])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/customers')
        if (!res.ok) return
        const result = await res.json()
        const data = result.data || (Array.isArray(result) ? result : [])
        setCustomers(
          Array.isArray(data) ? data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []
        )
      } catch {
        setCustomers([])
      }
    })()
  }, [])

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
      try {
        const res = await fetch('/api/admin/phase-codes')
        const result = await res.json().catch(() => ({}))
        if (!res.ok || result.success === false) {
          setPhaseCodes([])
          return
        }
        const rows = Array.isArray(result.data)
          ? (result.data as Array<{ id: string; code: string; name: string; isActive?: boolean; hourlyRate?: number }>)
          : []
        setPhaseCodes(rows.filter((r) => r && r.code && r.isActive !== false))
      } catch {
        setPhaseCodes([])
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      setDeliverablesLoading(true)
      try {
        const res = await fetch(`/api/quotes/${quote.id}/tasks`)
        const result = await res.json().catch(() => ({}))
        if (!res.ok || result.success === false) {
          setDeliverables([])
          return
        }
        const rows = Array.isArray(result.data) ? (result.data as DeliverableTask[]) : []
        // Treat tasks with taskCode as deliverables for this workflow
        setDeliverables(rows.filter((t) => !!t.taskCode))
      } catch {
        setDeliverables([])
      } finally {
        setDeliverablesLoading(false)
      }
    })()
  }, [quote.id])

  const customerOptions = useMemo(() => {
    const list = [...customers]
    if (quote.customer?.id && !list.some((c) => c.id === quote.customer!.id)) {
      list.push({
        id: quote.customer.id,
        name: quote.customer.name?.trim() || 'Customer',
      })
    }
    return list
  }, [customers, quote.customer])

  const customerSelectValue = useMemo(() => {
    if (!customerId) return '__none__'
    return customerOptions.some((c) => c.id === customerId) ? customerId : '__none__'
  }, [customerId, customerOptions])

  const deliverablesByCode = useMemo(() => {
    const m = new Map<string, DeliverableTask>()
    for (const d of deliverables) {
      const code = (d.taskCode || '').trim()
      if (code) m.set(code, d)
    }
    return m
  }, [deliverables])

  const phaseCodeById = useMemo(() => {
    const m = new Map<string, { id: string; code: string; name: string; hourlyRate?: number }>()
    for (const p of phaseCodes) m.set(p.id, p)
    return m
  }, [phaseCodes])

  const computedAmount = useMemo(() => {
    let total = 0
    for (const d of deliverables) {
      const hours = Number(d.estimatedHours || 0)
      if (!Number.isFinite(hours) || hours <= 0) continue
      const phase = d.laborCodeId ? phaseCodeById.get(d.laborCodeId) : null
      const rate = phase?.hourlyRate != null ? Number(phase.hourlyRate) : 0
      if (!Number.isFinite(rate) || rate <= 0) continue
      total += hours * rate
    }
    // 2-decimal for currency display
    return Math.round(total * 100) / 100
  }, [deliverables, phaseCodeById])

  const rollups = useMemo(() => {
    const totals: Record<string, number> = { PM: 0, AD: 0, SV: 0 }
    for (const d of deliverables) {
      const p = prefixFromTaskCode(d.taskCode)
      if (p === 'PM' || p === 'AD' || p === 'SV') {
        totals[p] += Number(d.estimatedHours || 0)
      }
    }
    return totals
  }, [deliverables])

  const [planItems, setPlanItems] = useState<Array<{ id: string; taskCode: string; description: string; laborCodeId: string | null }>>([])

  useEffect(() => {
    void (async () => {
      const planId = (quote as any)?.planId as string | undefined | null
      if (!planId) {
        setPlanItems([])
        return
      }
      try {
        const res = await fetch(`/api/quote-plans/${planId}`)
        const result = await res.json().catch(() => ({}))
        if (!res.ok || result.success === false) {
          setPlanItems([])
          return
        }
        const items = Array.isArray(result.data?.items) ? result.data.items : []
        setPlanItems(items)
      } catch {
        setPlanItems([])
      }
    })()
  }, [(quote as any)?.planId])

  const filteredTaskCodes = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const merged = new Map<string, TaskCode>()
    const source =
      planItems.length > 0
        ? planItems.map((p) => ({ code: p.taskCode, description: p.description, category: p.taskCode.slice(0, 2).toUpperCase() }))
        : RS_STANDARD_DELIVERABLES
    for (const s of source) merged.set(s.code, { id: s.code, code: s.code, description: s.description, category: s.category })
    for (const t of taskCodes.filter((t) => t.isActive !== false)) {
      const code = String(t.code || '').trim()
      if (!code) continue
      if (!merged.has(code)) merged.set(code, t)
    }
    const list = Array.from(merged.values())
    if (!q) return list
    return list.filter((t) => t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }, [taskCodes, filter, planItems])

  async function clearAllDeliverables() {
    if (deliverables.length === 0) return
    if (!confirm(`Remove all ${deliverables.length} deliverables from this quote?`)) return
    setDeliverablesLoading(true)
    try {
      for (const d of deliverables) {
        const res = await fetch(`/api/quotes/${quote.id}/tasks/${d.id}`, { method: 'DELETE' })
        const result = await res.json().catch(() => ({}))
        if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      }
      setDeliverables([])
      setSelectedTaskId(null)
      toast({ title: 'Deliverables cleared' })
    } catch (e) {
      toast({
        title: 'Could not clear deliverables',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setDeliverablesLoading(false)
    }
  }

  async function includeCode(code: TaskCode) {
    setDeliverablesLoading(true)
    try {
      const suggestedId = bestLaborCodeIdForDeliverable(code.code, code.description, phaseCodes)
      const res = await fetch(`/api/quotes/${quote.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${code.code} ${code.description}`,
          status: 'BACKLOG',
          taskCode: code.code,
          taskCodeDescription: code.description,
          dueDate: null,
          estimatedHours: 0,
          laborCodeId: suggestedId,
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      const row = result.data as DeliverableTask
      setDeliverables((prev) => [...prev, row])
      setSelectedTaskId(row.id)
    } catch (e) {
      toast({
        title: 'Could not add deliverable',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setDeliverablesLoading(false)
    }
  }

  async function ensureDeliverable(code: TaskCode, updates?: Partial<DeliverableTask>) {
    const existing = deliverablesByCode.get(code.code)
    if (existing) return existing
    setDeliverablesLoading(true)
    try {
      const suggestedId = bestLaborCodeIdForDeliverable(code.code, code.description, phaseCodes)
      const res = await fetch(`/api/quotes/${quote.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${code.code} ${code.description}`,
          status: 'BACKLOG',
          taskCode: code.code,
          taskCodeDescription: code.description,
          dueDate: updates?.dueDate ?? null,
          estimatedHours: updates?.estimatedHours ?? 0,
          laborCodeId: updates?.laborCodeId ?? suggestedId,
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      const row = result.data as DeliverableTask
      setDeliverables((prev) => [...prev, row])
      setSelectedTaskId(row.id)
      return row
    } catch (e) {
      toast({
        title: 'Could not add deliverable',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
      return null
    } finally {
      setDeliverablesLoading(false)
    }
  }

  async function updateDeliverable(taskId: string, updates: Partial<DeliverableTask>) {
    try {
      const res = await fetch(`/api/quotes/${quote.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      const row = result.data as DeliverableTask
      setDeliverables((prev) => prev.map((t) => (t.id === row.id ? row : t)))
    } catch (e) {
      toast({
        title: 'Could not update deliverable',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    }
  }

  async function removeDeliverable(taskId: string) {
    setDeliverablesLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/tasks/${taskId}`, { method: 'DELETE' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      setDeliverables((prev) => prev.filter((t) => t.id !== taskId))
      setSelectedTaskId((cur) => (cur === taskId ? null : cur))
    } catch (e) {
      toast({
        title: 'Could not remove deliverable',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setDeliverablesLoading(false)
    }
  }

  async function handleStatusChange(newStatus: 'APPROVED' | 'CANCELLED') {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Failed to update status')
      }
      toast({ title: `Quote ${newStatus.toLowerCase()}` })
      router.refresh()
    } catch (e) {
      toast({
        title: 'Error updating status',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    const t = title.trim()
    if (!t) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      // Amount is computed from deliverables (hours × phase hourly rate).
      const amountNum = Number(computedAmount || 0)
      const body: Record<string, unknown> = {
        title: t,
        description: description.trim() || null,
        amount: Number.isFinite(amountNum) ? Math.max(0, amountNum) : 0,
        customerId: customerId && customerId !== '__none__' ? customerId : null,
        validUntil: validUntil.trim() || null,
        paymentTerms: paymentTerms.trim() || null,
      }

      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Failed to save')
      }
      toast({ title: 'Quote saved' })
      router.refresh()
    } catch (e) {
      toast({
        title: 'Could not save',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleConvertToJob() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convertToJob`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to convert')
      const data = await res.json()
      toast({ title: 'Quote converted to job' })
      router.push(`/dashboard/jobs/${data.data?.id || ''}`)
    } catch {
      toast({ title: 'Error converting quote', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-none w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Edit quote</h1>
            <Badge className={STATUS_COLORS[quote.status] ?? 'bg-gray-100 text-gray-700'}>{quote.status}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1 tabular-nums">{quote.quoteNumber}</p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
          {quote.status === 'DRAFT' && (
            <>
              <Button size="sm" onClick={() => handleStatusChange('APPROVED')} disabled={loading || saving}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('CANCELLED')} disabled={loading || saving}>
                Cancel quote
              </Button>
            </>
          )}
          {(quote.status === 'APPROVED' || quote.status === 'WON') && !quote.convertedJob && (
            <Button size="sm" variant="secondary" onClick={() => void handleConvertToJob()} disabled={loading || saving}>
              <Briefcase className="h-4 w-4 mr-1" />
              Convert to Job
            </Button>
          )}
          {quote.convertedJob && (
            <Link href={`/dashboard/jobs/${quote.convertedJob.id}`}>
              <Button size="sm" variant="outline">
                View Job {quote.convertedJob.jobNumber}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quote details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qd-title">Title</Label>
            <Input id="qd-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qd-desc">Notes</Label>
            <Textarea
              id="qd-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Internal notes, scope reminders, follow-ups…"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qd-amt">Amount</Label>
              <Input
                id="qd-amt"
                type="number"
                min={0}
                step="0.01"
                value={String(computedAmount)}
                disabled
              />
              <div className="text-[11px] text-muted-foreground">
                Calculated from deliverables: hours × phase hourly rate.
              </div>
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={customerSelectValue}
                onValueChange={(v) => setCustomerId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {customerOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qd-until">Valid until</Label>
              <Input id="qd-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qd-terms">Payment terms</Label>
              <Input
                id="qd-terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deliverables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DeliverablesTimeline
            tasks={deliverables}
            selectedTaskId={selectedTaskId}
            onSelectTaskId={(id) => setSelectedTaskId(id)}
          />

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="deliverables-filter">Search</Label>
              <Input
                id="deliverables-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search codes or descriptions…"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => void clearAllDeliverables()}
                disabled={deliverablesLoading || deliverables.length === 0}
              >
                Clear deliverables
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {deliverablesLoading ? 'Updating…' : `${deliverables.length} selected`}
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
                  <th className="text-left font-medium px-3 py-2 w-[220px]">Phase</th>
                  <th className="px-3 py-2 w-[90px]" />
                </tr>
              </thead>
              <tbody>
                {filteredTaskCodes.map((c) => {
                  const included = deliverablesByCode.get(c.code)
                  const isSelected = included && included.id === selectedTaskId
                  return (
                    <tr key={c.id} className={isSelected ? 'bg-muted/20' : ''}>
                      <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                      <td className="px-3 py-2">{c.description}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          className="h-8"
                          value={included?.dueDate ? included.dueDate.split('T')[0] : ''}
                          onChange={(e) => {
                            const next = e.target.value || null
                            if (included) return void updateDeliverable(included.id, { dueDate: next })
                            void ensureDeliverable(c, { dueDate: next })
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.25"
                          className="h-8"
                          value={included?.estimatedHours ?? 0}
                          onChange={(e) => {
                            const n = e.target.value === '' ? 0 : Number(e.target.value)
                            if (included) return void updateDeliverable(included.id, { estimatedHours: n })
                            void ensureDeliverable(c, { estimatedHours: n })
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={included?.laborCodeId || '__none__'}
                          onValueChange={(v) => {
                            const next = v === '__none__' ? null : v
                            if (included) return void updateDeliverable(included.id, { laborCodeId: next })
                            void ensureDeliverable(c, { laborCodeId: next })
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue
                              placeholder="—"
                            >
                              {included?.laborCodeId
                                ? (phaseCodeById.get(included.laborCodeId)?.code || '').slice(0, 2)
                                : '—'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {phaseCodes.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {String(p.code || '').slice(0, 2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {included ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => void removeDeliverable(included.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8"
                            onClick={() => void includeCode(c)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          {quote.customer && (
            <div className="flex gap-2">
              <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span>{quote.customer.name}</span>
            </div>
          )}
          <div className="flex gap-2">
            <DollarSign className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <span className="tabular-nums">
              ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-2">
            <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <span className="text-gray-500">
              Created {formatDisplayDate(quote.createdAt, 'MMM d, yyyy')}
            </span>
          </div>
        </CardContent>
      </Card>

      {quote.revisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Revisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quote.revisions.map((rev) => (
                <div key={rev.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">Rev {rev.revisionNumber}</span>
                    <span className="text-xs text-gray-500">
                      {formatDisplayDate(rev.createdAt, 'MMM d, yyyy')}
                      {rev.createdBy
                        ? ` by ${rev.createdBy.name?.trim() || rev.createdBy.email || 'Unknown'}`
                        : ''}
                    </span>
                  </div>
                  {rev.notes && <p className="text-sm text-gray-600">{rev.notes}</p>}
                  {rev.laborEstimates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rev.laborEstimates.map((est) => (
                        <span key={est.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {est.discipline}: {est.estimatedHours}h
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
