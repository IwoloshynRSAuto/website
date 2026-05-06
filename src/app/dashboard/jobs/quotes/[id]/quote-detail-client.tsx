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
  Dialog,
  DialogContent,
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
  customerContactName: string | null
  customerContactEmail: string | null
  customerContactPhone: string | null
  estimatedHours: number | null
  hourlyRate: number | null
  customer: { id: string; name: string; email: string | null; phone: string | null } | null
  convertedJob: { id: string; jobNumber: string; title: string } | null
  revisions: Revision[]
}

type BomPart = {
  id: string
  bomId: string
  partId: string | null
  quantity: number
  purchasePrice: number
  markupPercent: number
  customerPrice: number
  manufacturer: string
  description: string | null
  source: string | null
  notes: string | null
  estimatedDelivery: string | null
  status: 'HOLD' | 'ORDER' | 'PLACED' | 'HERE' | 'STOCK' | 'CUSTOMER_SUPPLIED'
  partNumber: string
}

type Bom = {
  id: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  notes: string | null
  tags: string | null
  linkedQuoteId: string | null
  parts: BomPart[]
}

type PartsSearchRow = {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  category: string | null
  latestVendorPrice: null | { price: number; vendorName: string; leadTimeDays: number | null }
}

type BomTemplateRow = { id: string; name: string; partsCount: number; updatedAt: string }

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

  const [bomLoading, setBomLoading] = useState(false)
  const [bom, setBom] = useState<Bom | null>(null)
  const [bomAddOpen, setBomAddOpen] = useState(false)
  const [partsSearch, setPartsSearch] = useState('')
  const [partsSearching, setPartsSearching] = useState(false)
  const [partsResults, setPartsResults] = useState<PartsSearchRow[]>([])
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templates, setTemplates] = useState<BomTemplateRow[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [manualRow, setManualRow] = useState({
    partNumber: '',
    manufacturer: '',
    description: '',
    quantity: '1',
    purchasePrice: '0',
    markupPercent: '20',
    source: '',
    status: 'HOLD' as BomPart['status'],
  })

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

  const refreshBom = async (bomId: string) => {
    const res = await fetch(`/api/boms/${bomId}`)
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load BOM')
    setBom(json.data as Bom)
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      setBomLoading(true)
      try {
        const res = await fetch(`/api/quotes/${quote.id}/get-or-create-bom`, { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load BOM')
        if (!cancelled) setBom(json.data as Bom)
      } catch {
        if (!cancelled) setBom(null)
      } finally {
        if (!cancelled) setBomLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [quote.id])

  const loadTemplates = async () => {
    setTemplatesLoading(true)
    try {
      const res = await fetch('/api/bom-templates')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load templates')
      setTemplates((json.data || []) as BomTemplateRow[])
    } catch {
      setTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }

  // Contacts are managed on the Customers page; keep quote UI as customer-only.

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

      <details className="group rounded-lg border bg-card" open>
        <summary className="cursor-pointer select-none px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section</p>
            <p className="text-base font-semibold">Bill of Materials (BOM)</p>
          </div>
          <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
          <span className="text-xs text-muted-foreground hidden group-open:inline">Hide</span>
        </summary>
        <div className="px-6 pb-6 space-y-4">
          {bomLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading BOM…
            </div>
          ) : !bom ? (
            <div className="text-sm text-gray-600">No BOM available.</div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {bom.parts.length} line(s) • Total customer price:{' '}
                  <span className="font-semibold text-foreground">
                    $
                    {bom.parts
                      .reduce((sum, p) => sum + Number(p.customerPrice || 0), 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setSelectedTemplateId('')
                      setTemplatesOpen(true)
                      await loadTemplates()
                    }}
                  >
                    Load previous BOM
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setBomAddOpen(true)}>
                    Add line
                  </Button>
                </div>
              </div>

              <div className="overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-3 py-2 w-[170px]">Part #</th>
                      <th className="text-left font-medium px-3 py-2 min-w-[260px]">Description</th>
                      <th className="text-left font-medium px-3 py-2 w-[80px]">Qty</th>
                      <th className="text-left font-medium px-3 py-2 w-[120px]">Purchase</th>
                      <th className="text-left font-medium px-3 py-2 w-[110px]">Markup %</th>
                      <th className="text-left font-medium px-3 py-2 w-[140px]">Customer</th>
                      <th className="text-left font-medium px-3 py-2 w-[140px]">Status</th>
                      <th className="text-left font-medium px-3 py-2 w-[160px]">Vendor</th>
                      <th className="text-left font-medium px-3 py-2 w-[140px]">ETA</th>
                      <th className="px-3 py-2 w-[170px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {bom.parts.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={10}>
                          No BOM lines yet.
                        </td>
                      </tr>
                    ) : (
                      bom.parts.map((p) => (
                        <BomRowInline
                          key={p.id}
                          bomId={bom.id}
                          part={p}
                          onChanged={async () => {
                            await refreshBom(bom.id)
                          }}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </details>

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
          <DeliverablesTimeline
            tasks={deliverables.map((d) => ({
              ...d,
              groupCode: d.laborCodeId ? (phaseCodeById.get(d.laborCodeId)?.code || '').slice(0, 2) : null,
            }))}
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
        </div>
      </details>

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

      <Dialog open={bomAddOpen} onOpenChange={setBomAddOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add BOM line</DialogTitle>
          </DialogHeader>

          {!bom ? (
            <div className="text-sm text-muted-foreground">No BOM loaded.</div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Quick add from Parts DB</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={partsSearch}
                    onChange={(e) => setPartsSearch(e.target.value)}
                    placeholder="Search by part #, manufacturer, description…"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setPartsSearching(true)
                      try {
                        const res = await fetch(`/api/parts?search=${encodeURIComponent(partsSearch.trim())}&limit=25`)
                        const json = await res.json().catch(() => ({}))
                        if (!res.ok || !json?.success) throw new Error(json?.error || 'Search failed')
                        setPartsResults((json.data || []) as PartsSearchRow[])
                      } catch (e: unknown) {
                        toast({
                          title: 'Parts search failed',
                          description: e instanceof Error ? e.message : undefined,
                          variant: 'destructive',
                        })
                        setPartsResults([])
                      } finally {
                        setPartsSearching(false)
                      }
                    }}
                    disabled={partsSearching}
                  >
                    {partsSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>

                {partsResults.length > 0 && (
                  <div className="max-h-64 overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 text-muted-foreground">
                        <tr>
                          <th className="text-left font-medium px-3 py-2 w-[180px]">Part #</th>
                          <th className="text-left font-medium px-3 py-2 w-[180px]">Mfr</th>
                          <th className="text-left font-medium px-3 py-2">Description</th>
                          <th className="text-left font-medium px-3 py-2 w-[140px]">Latest price</th>
                          <th className="px-3 py-2 w-[120px]" />
                        </tr>
                      </thead>
                      <tbody>
                        {partsResults.map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{r.partNumber}</td>
                            <td className="px-3 py-2 text-xs">{r.manufacturer}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{r.description || '—'}</td>
                            <td className="px-3 py-2 text-xs">
                              {r.latestVendorPrice
                                ? `$${r.latestVendorPrice.price.toFixed(2)} (${r.latestVendorPrice.vendorName})`
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const purchasePrice = r.latestVendorPrice?.price ?? 0
                                    const source = r.latestVendorPrice?.vendorName ?? null
                                    const res = await fetch(`/api/boms/${bom.id}/parts`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        partId: r.id,
                                        quantity: 1,
                                        purchasePrice,
                                        markupPercent: 20,
                                        source,
                                        status: 'HOLD',
                                      }),
                                    })
                                    const json = await res.json().catch(() => ({}))
                                    if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to add line')
                                    toast({ title: 'Added to BOM' })
                                    await refreshBom(bom.id)
                                  } catch (e: unknown) {
                                    toast({
                                      title: 'Could not add line',
                                      description: e instanceof Error ? e.message : undefined,
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="font-semibold">Manual line</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Part #</Label>
                    <Input value={manualRow.partNumber} onChange={(e) => setManualRow((p) => ({ ...p, partNumber: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Manufacturer</Label>
                    <Input value={manualRow.manufacturer} onChange={(e) => setManualRow((p) => ({ ...p, manufacturer: e.target.value }))} />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <Label>Description</Label>
                    <Input value={manualRow.description} onChange={(e) => setManualRow((p) => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Qty</Label>
                    <Input value={manualRow.quantity} inputMode="numeric" onChange={(e) => setManualRow((p) => ({ ...p, quantity: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Purchase price</Label>
                    <Input value={manualRow.purchasePrice} inputMode="decimal" onChange={(e) => setManualRow((p) => ({ ...p, purchasePrice: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Markup %</Label>
                    <Input value={manualRow.markupPercent} inputMode="decimal" onChange={(e) => setManualRow((p) => ({ ...p, markupPercent: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={manualRow.status} onValueChange={(v) => setManualRow((p) => ({ ...p, status: v as BomPart['status'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOLD">Hold</SelectItem>
                        <SelectItem value="ORDER">Order</SelectItem>
                        <SelectItem value="PLACED">Placed</SelectItem>
                        <SelectItem value="HERE">Here</SelectItem>
                        <SelectItem value="STOCK">Stock</SelectItem>
                        <SelectItem value="CUSTOMER_SUPPLIED">Customer Supplied</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Vendor/source</Label>
                    <Input value={manualRow.source} onChange={(e) => setManualRow((p) => ({ ...p, source: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setBomAddOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!bom) return
                try {
                  const res = await fetch(`/api/boms/${bom.id}/parts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      partId: null,
                      partNumber: manualRow.partNumber || null,
                      manufacturer: manualRow.manufacturer || null,
                      description: manualRow.description || null,
                      quantity: Math.max(1, Number(manualRow.quantity) || 1),
                      purchasePrice: Math.max(0, Number(manualRow.purchasePrice) || 0),
                      markupPercent: Math.max(0, Number(manualRow.markupPercent) || 0),
                      source: manualRow.source || null,
                      status: manualRow.status,
                    }),
                  })
                  const json = await res.json().catch(() => ({}))
                  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to add line')
                  toast({ title: 'Added manual line' })
                  await refreshBom(bom.id)
                  setManualRow({
                    partNumber: '',
                    manufacturer: '',
                    description: '',
                    quantity: '1',
                    purchasePrice: '0',
                    markupPercent: '20',
                    source: '',
                    status: 'HOLD',
                  })
                } catch (e: unknown) {
                  toast({
                    title: 'Could not add manual line',
                    description: e instanceof Error ? e.message : undefined,
                    variant: 'destructive',
                  })
                }
              }}
              disabled={!bom}
            >
              Add manual line
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load previous BOM (template)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {templatesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
              </div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground">No templates found.</div>
            ) : (
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplateId || '__none__'} onValueChange={(v) => setSelectedTemplateId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select…</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.partsCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Loading replaces the current quote BOM lines.</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTemplatesOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!selectedTemplateId) return
                try {
                  const res = await fetch(`/api/bom-templates/${selectedTemplateId}/load-into-quote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quoteId: quote.id, replaceExisting: true }),
                  })
                  const json = await res.json().catch(() => ({}))
                  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load template')
                  toast({ title: 'BOM loaded' })
                  setTemplatesOpen(false)
                  if (bom) await refreshBom(bom.id)
                } catch (e: unknown) {
                  toast({
                    title: 'Could not load BOM',
                    description: e instanceof Error ? e.message : undefined,
                    variant: 'destructive',
                  })
                }
              }}
              disabled={!selectedTemplateId}
            >
              Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BomRowInline({
  bomId,
  part,
  onChanged,
}: {
  bomId: string
  part: BomPart
  onChanged: () => Promise<void> | void
}) {
  const { toast } = useToast()
  const [qty, setQty] = useState(String(part.quantity))
  const [purchasePrice, setPurchasePrice] = useState(String(part.purchasePrice))
  const [markupPercent, setMarkupPercent] = useState(String(part.markupPercent))
  const [status, setStatus] = useState<BomPart['status']>(part.status)
  const [source, setSource] = useState(part.source || '')
  const [eta, setEta] = useState(part.estimatedDelivery ? part.estimatedDelivery.split('T')[0] : '')
  const [saving, setSaving] = useState(false)

  const hasChanges =
    Math.max(1, Number(qty) || 1) !== part.quantity ||
    Math.max(0, Number(purchasePrice) || 0) !== part.purchasePrice ||
    Math.max(0, Number(markupPercent) || 0) !== part.markupPercent ||
    status !== part.status ||
    source !== (part.source || '') ||
    eta !== (part.estimatedDelivery ? part.estimatedDelivery.split('T')[0] : '')

  return (
    <tr className="border-t">
      <td className="px-3 py-2 font-mono text-xs">{part.partNumber}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{part.description || '—'}</td>
      <td className="px-3 py-2">
        <Input className="h-8 text-xs" value={qty} inputMode="numeric" onChange={(e) => setQty(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 text-xs" value={purchasePrice} inputMode="decimal" onChange={(e) => setPurchasePrice(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 text-xs" value={markupPercent} inputMode="decimal" onChange={(e) => setMarkupPercent(e.target.value)} />
      </td>
      <td className="px-3 py-2 text-xs font-medium tabular-nums">${Number(part.customerPrice || 0).toFixed(2)}</td>
      <td className="px-3 py-2">
        <Select value={status} onValueChange={(v) => setStatus(v as BomPart['status'])}>
          <SelectTrigger className="h-8 text-xs">
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
      <td className="px-3 py-2">
        <Input className="h-8 text-xs" value={source} onChange={(e) => setSource(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 text-xs" type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
      </td>
      <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasChanges || saving}
          onClick={async () => {
            setSaving(true)
            try {
              const res = await fetch(`/api/boms/${bomId}/parts/${part.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  quantity: Math.max(1, Number(qty) || 1),
                  purchasePrice: Math.max(0, Number(purchasePrice) || 0),
                  markupPercent: Math.max(0, Number(markupPercent) || 0),
                  source: source || null,
                  status,
                  estimatedDelivery: eta || null,
                }),
              })
              const json = await res.json().catch(() => ({}))
              if (!res.ok || !json?.success) throw new Error(json?.error || 'Save failed')
              toast({ title: 'BOM line saved' })
              await onChanged()
            } catch (e: unknown) {
              toast({
                title: 'Could not save BOM line',
                description: e instanceof Error ? e.message : undefined,
                variant: 'destructive',
              })
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={saving}
          onClick={async () => {
            if (!confirm('Delete this BOM line?')) return
            setSaving(true)
            try {
              const res = await fetch(`/api/boms/${bomId}/parts/${part.id}`, { method: 'DELETE' })
              const json = await res.json().catch(() => ({}))
              if (!res.ok || !json?.success) throw new Error(json?.error || 'Delete failed')
              toast({ title: 'BOM line deleted' })
              await onChanged()
            } catch (e: unknown) {
              toast({
                title: 'Could not delete BOM line',
                description: e instanceof Error ? e.message : undefined,
                variant: 'destructive',
              })
            } finally {
              setSaving(false)
            }
          }}
        >
          Delete
        </Button>
      </td>
    </tr>
  )
}
