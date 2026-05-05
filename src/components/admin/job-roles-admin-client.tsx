'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { dashboardUi } from '@/components/layout/dashboard-ui'
import { cn } from '@/lib/utils'
import { stripOtLaborCodeSuffix, withOtLaborCodeSuffix } from '@/lib/labor-codes/ot-code'
import { Badge } from '@/components/ui/badge'

type JobRole = {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

type PhaseCode = {
  id: string
  code: string
  name: string
  description?: string | null
  hourlyRate?: any
  isActive?: boolean
  isOvertimePhase?: boolean
  overtimeRateMultiplier?: number | string
}
type Employee = { id: string; name: string | null; email: string; jobRoleId: string | null }

export function JobRolesAdminClient() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<JobRole[]>([])
  const [phaseCodes, setPhaseCodes] = useState<PhaseCode[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [newRole, setNewRole] = useState({ name: '' })
  const [categorySearch, setCategorySearch] = useState('')
  const [phaseSearch, setPhaseSearch] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [phaseLibSearch, setPhaseLibSearch] = useState('')
  const [newPhase, setNewPhase] = useState({ code: '', name: '', hourlyRate: '', isOtPhase: false })
  const [otMultiplier, setOtMultiplier] = useState('1.5')
  const [otSaving, setOtSaving] = useState(false)
  const [adminSection, setAdminSection] = useState<'categories' | 'library' | 'costing'>('categories')
  const [categorySetupTab, setCategorySetupTab] = useState<'codes' | 'employees'>('codes')

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId) || null, [roles, selectedRoleId])
  const sortedPhaseCodes = useMemo(
    () =>
      [...phaseCodes]
        .filter((c) => {
          const q = phaseSearch.trim().toLowerCase()
          if (!q) return true
          const hay = `${c.code ?? ''} ${c.name ?? ''}`.toLowerCase()
          return hay.includes(q)
        })
        .sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? ''))),
    [phaseCodes, phaseSearch]
  )
  const sortedEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    return [...employees]
      .filter((e) => {
        if (!q) return true
        return `${e.name ?? ''} ${e.email ?? ''}`.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const an = String(a.name ?? a.email ?? '').toLowerCase()
        const bn = String(b.name ?? b.email ?? '').toLowerCase()
        return an.localeCompare(bn)
      })
  }, [employees, employeeSearch])

  const filteredRoles = useMemo(() => {
    const q = categorySearch.trim().toLowerCase()
    const base = [...roles].sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return base
    return base.filter((r) => String(r.name ?? '').toLowerCase().includes(q))
  }, [roles, categorySearch])

  const load = async () => {
    setLoading(true)
    try {
      const [rolesRes, codesRes, usersRes, otRes] = await Promise.all([
        fetch('/api/admin/job-roles'),
        fetch('/api/admin/phase-codes'),
        fetch('/api/users?activeOnly=true'),
        fetch('/api/admin/settings/ot-multiplier'),
      ])
      const rolesJson = await rolesRes.json()
      const codesJson = await codesRes.json()
      const usersJson = await usersRes.json()
      const otJson = otRes.ok ? await otRes.json().catch(() => null) : null
      if (!rolesRes.ok || !rolesJson?.success) throw new Error(rolesJson?.error || 'Failed to load categories')
      if (!codesRes.ok || !codesJson?.success) throw new Error(codesJson?.error || 'Failed to load phase codes')
      if (!usersRes.ok || !usersJson?.success) throw new Error(usersJson?.error || 'Failed to load employees')
      setRoles(Array.isArray(rolesJson.data) ? rolesJson.data : [])
      setPhaseCodes(Array.isArray(codesJson.data) ? codesJson.data : [])
      setEmployees(Array.isArray(usersJson.data) ? usersJson.data : [])
      if (otJson?.success && otJson.data?.otMultiplier != null) {
        setOtMultiplier(String(otJson.data.otMultiplier))
      }
      if (!selectedRoleId && Array.isArray(rolesJson.data) && rolesJson.data.length) {
        setSelectedRoleId(rolesJson.data[0].id)
      }
    } catch (e: any) {
      toast({ title: 'Could not load categories', description: e?.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const saveOtMultiplier = async () => {
    const n = parseFloat(otMultiplier)
    if (!Number.isFinite(n) || n <= 0) {
      toast({ title: 'Invalid multiplier', description: 'Enter a positive number.', variant: 'destructive' })
      return
    }
    setOtSaving(true)
    try {
      const res = await fetch('/api/admin/settings/ot-multiplier', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otMultiplier: n }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Save failed')
      setOtMultiplier(String(json.data?.otMultiplier ?? n))
      toast({ title: 'Saved', description: 'Overtime multiplier updated.' })
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message, variant: 'destructive' })
    } finally {
      setOtSaving(false)
    }
  }

  const phaseLibrary = useMemo(() => {
    const q = phaseLibSearch.trim().toLowerCase()
    return [...phaseCodes]
      .filter((c) => {
        if (!q) return true
        return `${c.code ?? ''} ${c.name ?? ''} ${c.description ?? ''}`.toLowerCase().includes(q)
      })
      .sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? '')))
  }, [phaseCodes, phaseLibSearch])

  const loadRoleCodes = async (roleId: string) => {
    try {
      const res = await fetch(`/api/admin/job-roles/${roleId}`)
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load role')
      const rawCodes = Array.isArray(json?.data?.phaseCodes) ? (json.data.phaseCodes as PhaseCode[]) : []
      const codes = rawCodes.filter((c) => c && typeof c.id === 'string')
      setSelectedCodes(new Set(codes.map((c) => c.id)))
    } catch (e: any) {
      toast({ title: 'Could not load role phase codes', description: e?.message, variant: 'destructive' })
      setSelectedCodes(new Set())
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedRoleId) return
    void loadRoleCodes(selectedRoleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId])

  useEffect(() => {
    if (!selectedRoleId) return
    setSelectedEmployees(new Set(employees.filter((e) => e.jobRoleId === selectedRoleId).map((e) => e.id)))
  }, [employees, selectedRoleId])

  const createRole = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/job-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRole.name, description: null, isActive: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Create failed')
      toast({ title: 'Category created', description: 'Default phase codes applied (AD, HOL, PTD, TR, TRN).' })
      setNewRole({ name: '' })
      await load()
      setSelectedRoleId(json.data.id)

      // Default phase codes for a new category
      const DEFAULT_CODES = new Set(['AD', 'HOL', 'PTD', 'TR', 'TRN'])
      const defaultIds = phaseCodes.filter((c) => DEFAULT_CODES.has(c.code)).map((c) => c.id)
      if (defaultIds.length) {
        setSelectedCodes(new Set(defaultIds))
        await fetch(`/api/admin/job-roles/${json.data.id}/phase-codes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ laborCodeIds: defaultIds }),
        }).then(async (r) => {
          const j = await r.json().catch(() => ({}))
          if (!r.ok || !j?.success) throw new Error(j?.error || 'Failed to apply default codes')
        })
      }
    } catch (e: any) {
      toast({ title: 'Could not create role', description: e?.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const saveRoleCodes = async () => {
    if (!selectedRoleId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/job-roles/${selectedRoleId}/phase-codes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laborCodeIds: Array.from(selectedCodes) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Save failed')
      toast({ title: 'Role phase codes saved' })
    } catch (e: any) {
      toast({ title: 'Could not save role phase codes', description: e?.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const saveCategoryEmployees = async () => {
    if (!selectedRoleId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/job-roles/${selectedRoleId}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedEmployees) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Save failed')
      toast({ title: 'Category employees saved' })
      await load()
    } catch (e: any) {
      toast({ title: 'Could not save employees', description: e?.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const setRoleActive = async (roleId: string, isActive: boolean) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/job-roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Update failed')
      setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, isActive } : r)))
      toast({ title: isActive ? 'Role activated' : 'Role deactivated' })
    } catch (e: any) {
      toast({ title: 'Could not update role', description: e?.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    const ok = window.confirm(`Delete Job Role "${role?.name || 'role'}"? This cannot be undone.`)
    if (!ok) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/job-roles/${roleId}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Delete failed')
      toast({ title: 'Role deleted' })
      setRoles((prev) => prev.filter((r) => r.id !== roleId))
      if (selectedRoleId === roleId) {
        const next = roles.filter((r) => r.id !== roleId)[0]?.id || null
        setSelectedRoleId(next)
        setSelectedCodes(new Set())
      }
    } catch (e: any) {
      toast({ title: 'Could not delete role', description: e?.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Phase codes sections"
        className="mb-4 grid h-auto w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-4xl"
      >
        {(['categories', 'library', 'costing'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={adminSection === key}
            className={cn(
              'inline-flex min-h-[42px] items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors sm:min-h-[40px]',
              adminSection === key
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            )}
            onClick={() => setAdminSection(key)}
          >
            {key === 'categories' ? 'Categories' : key === 'library' ? 'Phase code library' : 'Rates & overtime'}
          </button>
        ))}
      </div>

      {adminSection === 'categories' ? (
        <div className="mt-0 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="border border-slate-200 shadow-md lg:col-span-4">
          <CardHeader className="border-b py-3 px-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Job categories</p>
                <p className="text-sm text-slate-600">{loading ? 'Loading…' : `${roles.length} total`}</p>
              </div>
              <Badge variant="secondary" className="whitespace-nowrap">
                Phase access
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="roleName">Create category</Label>
              <div className="flex gap-2">
                <Input
                  id="roleName"
                  value={newRole.name}
                  onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. PM, Controls Engineering"
                />
                <Button onClick={() => void createRole()} disabled={saving || !newRole.name.trim()}>
                  Create
                </Button>
              </div>
              <p className="text-xs text-slate-600">
                New categories auto-include: <span className="font-mono">AD</span>, <span className="font-mono">HOL</span>,{' '}
                <span className="font-mono">PTD</span>, <span className="font-mono">TR</span>, <span className="font-mono">TRN</span>
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Input value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} placeholder="Search categories…" />
              {filteredRoles.length === 0 ? (
                <div className="text-sm text-slate-600 py-6">No categories yet. Create one above.</div>
              ) : (
                <div className="max-h-[520px] overflow-auto divide-y rounded-md border">
                  {filteredRoles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={[
                        'w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors',
                        selectedRoleId === r.id ? 'bg-slate-50' : '',
                      ].join(' ')}
                      onClick={() => setSelectedRoleId(r.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{r.name}</div>
                        <span className={r.isActive ? 'text-xs text-emerald-700' : 'text-xs text-slate-500'}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-md lg:col-span-8">
          <CardHeader className="border-b py-3 px-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Category setup</p>
                <p className="text-sm text-slate-600">
                  {selectedRole ? (
                    <>
                      <span className="font-medium">{selectedRole.name}</span>
                      <span className="text-slate-400"> • </span>
                      <span>{selectedCodes.size} phase code(s)</span>
                      <span className="text-slate-400"> • </span>
                      <span>{selectedEmployees.size} employee(s)</span>
                    </>
                  ) : (
                    'Select a category on the left.'
                  )}
                </p>
              </div>
              {selectedRoleId ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => void setRoleActive(selectedRoleId, !Boolean(selectedRole?.isActive))} disabled={saving}>
                    {selectedRole?.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="destructive" onClick={() => void deleteRole(selectedRoleId)} disabled={saving}>
                    Delete
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {!selectedRoleId ? (
              <div className="rounded-md border bg-slate-50 p-6 text-sm text-slate-700">
                Pick a category to edit which phase codes and employees belong to it.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      categorySetupTab === 'codes'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                    onClick={() => setCategorySetupTab('codes')}
                  >
                    Assigned codes
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      categorySetupTab === 'employees'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                    onClick={() => setCategorySetupTab('employees')}
                  >
                    Employees
                  </button>
                </div>

                {categorySetupTab === 'codes' ? (
                <div className="mt-2 space-y-3">
                  <p className="text-sm text-slate-600">
                    Choose which phase codes people in this category may log on jobs. Edit codes and hourly rates in the{' '}
                    <span className="font-medium">Phase code library</span> tab; set the overtime multiplier under{' '}
                    <span className="font-medium">Rates & overtime</span>.
                  </p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Input value={phaseSearch} onChange={(e) => setPhaseSearch(e.target.value)} placeholder="Search phase codes…" className="max-w-sm" />
                    <Button variant="outline" onClick={() => void saveRoleCodes()} disabled={saving}>
                      Save assignments
                    </Button>
                  </div>
                  <div className="max-h-[520px] overflow-auto space-y-2 pr-1 rounded-md border p-3">
                    {sortedPhaseCodes.map((c) => {
                      const checked = selectedCodes.has(c.id)
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setSelectedCodes((prev) => {
                                const next = new Set(prev)
                                if (v) next.add(c.id)
                                else next.delete(c.id)
                                return next
                              })
                            }}
                          />
                          <span className="font-mono">{c.code ?? '—'}</span>
                          <span className="text-slate-600 truncate">{c.name ?? ''}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                ) : (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Input
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Search employees…"
                      className="max-w-sm"
                    />
                    <Button variant="outline" onClick={() => void saveCategoryEmployees()} disabled={saving}>
                      Save employees
                    </Button>
                  </div>
                  <div className="max-h-[520px] overflow-auto space-y-2 pr-1 rounded-md border p-3">
                    {sortedEmployees.map((e) => {
                      const checked = selectedEmployees.has(e.id)
                      return (
                        <label key={e.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setSelectedEmployees((prev) => {
                                const next = new Set(prev)
                                if (v) next.add(e.id)
                                else next.delete(e.id)
                                return next
                              })
                            }}
                          />
                          <span className="font-medium">{e.name || '—'}</span>
                          <span className="text-slate-600 truncate">{e.email}</span>
                          {e.jobRoleId && e.jobRoleId !== selectedRoleId ? (
                            <span className="text-xs text-slate-500">(assigned elsewhere)</span>
                          ) : null}
                        </label>
                      )
                    })}
                  </div>
                </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
      ) : null}

      {adminSection === 'library' ? (
        <div className="mt-0">
          <Card className="border border-slate-200 shadow-md">
            <CardHeader className="border-b py-3 px-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Phase code library</p>
              <p className="text-sm text-slate-600">
                Check <span className="font-medium">OT time</span> to use the same code with a <span className="font-mono">/OT</span> suffix (e.g. WC →
                WC/OT). Hours on that phase roll up to the base phase on jobs. Cost uses the base phase&apos;s hourly rate × the OT multiplier (editable).
              </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-semibold">Add phase code</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newPhase.code}
                      onChange={(e) => setNewPhase((p) => ({ ...p, code: e.target.value }))}
                      placeholder="Code (e.g. AD)"
                    />
                    <Input
                      value={newPhase.hourlyRate}
                      onChange={(e) => setNewPhase((p) => ({ ...p, hourlyRate: e.target.value }))}
                      placeholder="Cost/hr"
                    />
                  </div>
                  <Input
                    value={newPhase.name}
                    onChange={(e) => setNewPhase((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Name"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={newPhase.isOtPhase}
                      onCheckedChange={(v) => setNewPhase((p) => ({ ...p, isOtPhase: v === true }))}
                    />
                    OT time (append /OT to code)
                  </label>
                  <Button
                    onClick={async () => {
                      setSaving(true)
                      try {
                        const rate = newPhase.hourlyRate.trim() === '' ? null : Number(newPhase.hourlyRate)
                        const res = await fetch('/api/admin/phase-codes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            code: newPhase.code,
                            name: newPhase.name,
                            hourlyRate: rate,
                            isActive: true,
                            isOvertimePhase: newPhase.isOtPhase,
                          }),
                        })
                        const json = await res.json().catch(() => ({}))
                        if (!res.ok || !json?.success) throw new Error(json?.error || 'Create failed')
                        toast({ title: 'Phase code created' })
                        setNewPhase({ code: '', name: '', hourlyRate: '', isOtPhase: false })
                        await load()
                      } catch (e: any) {
                        toast({ title: 'Could not create phase code', description: e?.message, variant: 'destructive' })
                      } finally {
                        setSaving(false)
                      }
                    }}
                    disabled={saving || !newPhase.code.trim() || !newPhase.name.trim()}
                  >
                    Add
                  </Button>
                </div>

                <div className="lg:col-span-2 rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold">All phase codes</p>
                    <Input
                      value={phaseLibSearch}
                      onChange={(e) => setPhaseLibSearch(e.target.value)}
                      placeholder="Search…"
                      className="max-w-sm"
                    />
                  </div>
                  <div className="max-h-[520px] overflow-auto divide-y">
                    {phaseLibrary.map((c) => (
                      <div key={c.id} className="py-2 flex flex-wrap items-center gap-2">
                        <div className="w-[80px] font-mono">{c.code ?? '—'}</div>
                        <Input
                          className="h-8 flex-1 min-w-[120px]"
                          value={c.name ?? ''}
                          onChange={(e) => setPhaseCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                        />
                        <Input
                          className="h-8 w-[100px]"
                          value={c.hourlyRate != null ? String(c.hourlyRate) : ''}
                          onChange={(e) =>
                            setPhaseCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, hourlyRate: e.target.value } : x)))
                          }
                          placeholder="Cost/hr"
                        />
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                          <Checkbox
                            checked={Boolean(c.isOvertimePhase) || /\/OT$/i.test(String(c.code || ''))}
                            onCheckedChange={(v) => {
                              const on = v === true
                              setPhaseCodes((prev) =>
                                prev.map((x) => {
                                  if (x.id !== c.id) return x
                                  const base = stripOtLaborCodeSuffix(String(x.code || '')).toUpperCase()
                                  return {
                                    ...x,
                                    isOvertimePhase: on,
                                    code: on ? withOtLaborCodeSuffix(base) : base,
                                  }
                                })
                              )
                            }}
                          />
                          OT time
                        </label>
                        <Input
                          className="h-8 w-14 text-xs"
                          title="OT multiplier on base hourly rate for this code"
                          value={c.overtimeRateMultiplier != null ? String(c.overtimeRateMultiplier) : '1.5'}
                          onChange={(e) =>
                            setPhaseCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, overtimeRateMultiplier: e.target.value } : x)))
                          }
                        />
                        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <Checkbox
                            checked={Boolean(c.isActive ?? true)}
                            onCheckedChange={(v) =>
                              setPhaseCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive: Boolean(v) } : x)))
                            }
                          />
                          Active
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setSaving(true)
                            try {
                              const rateVal =
                                c.hourlyRate === '' || c.hourlyRate == null ? null : Number(String(c.hourlyRate).trim())
                              const multRaw = c.overtimeRateMultiplier
                              const mult =
                                multRaw === '' || multRaw == null ? 1.5 : Number(String(multRaw).trim())
                              const res = await fetch(`/api/admin/phase-codes/${c.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  code: String(c.code || '').trim().toUpperCase(),
                                  name: String(c.name || '').trim(),
                                  hourlyRate: rateVal,
                                  isActive: Boolean(c.isActive ?? true),
                                  isOvertimePhase: Boolean(c.isOvertimePhase) || /\/OT$/i.test(String(c.code || '')),
                                  overtimeRateMultiplier: Number.isFinite(mult) && mult > 0 ? mult : 1.5,
                                }),
                              })
                              const json = await res.json().catch(() => ({}))
                              if (!res.ok || !json?.success) throw new Error(json?.error || 'Save failed')
                              toast({ title: 'Saved' })
                              await load()
                            } catch (e: any) {
                              toast({ title: 'Could not save', description: e?.message, variant: 'destructive' })
                            } finally {
                              setSaving(false)
                            }
                          }}
                          disabled={saving}
                        >
                          Save
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            const ok = window.confirm(`Delete phase code ${c.code}? If it has time entries it will be deactivated instead.`)
                            if (!ok) return
                            setSaving(true)
                            try {
                              const res = await fetch(`/api/admin/phase-codes/${c.id}`, { method: 'DELETE' })
                              const json = await res.json().catch(() => ({}))
                              if (!res.ok || !json?.success) throw new Error(json?.error || 'Delete failed')
                              toast({ title: 'Deleted' })
                              await load()
                            } catch (e: any) {
                              toast({ title: 'Could not delete', description: e?.message, variant: 'destructive' })
                            } finally {
                              setSaving(false)
                            }
                          }}
                          disabled={saving}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {adminSection === 'costing' ? (
        <div className="mt-0">
          <Card className="border border-slate-200 shadow-md">
            <CardHeader className="border-b py-3 px-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Rates & overtime</p>
              <p className="text-sm text-slate-600">
                Regular-time cost uses each phase code&apos;s cost per hour from the library. Overtime uses that base rate multiplied by the global value
                below (typically 1.5). <span className="font-medium text-slate-800">OT time</span> rows use a <span className="font-mono">/OT</span> code;
                costing is (matching non-/OT phase rate) × that row&apos;s OT multiplier, and those hours roll up to the base phase on the job card.
              </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="rounded-md border border-amber-200 bg-amber-50/80 p-4 space-y-3 max-w-xl">
                <div>
                  <Label className="text-sm font-semibold text-slate-800">Global overtime multiplier</Label>
                  <p className="text-xs text-slate-600 mt-1">
                    Applied to overtime hours on submitted job time (base rate × OT hours × multiplier). Defaults to 1.5 if unset.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ot-mult-costing" className="text-xs text-slate-600">
                      Multiplier
                    </Label>
                    <Input
                      id="ot-mult-costing"
                      type="number"
                      step="0.01"
                      min={0.01}
                      className="w-32 bg-white"
                      value={otMultiplier}
                      onChange={(e) => setOtMultiplier(e.target.value)}
                      disabled={loading || otSaving}
                    />
                  </div>
                  <Button type="button" onClick={() => void saveOtMultiplier()} disabled={loading || otSaving}>
                    Save multiplier
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

