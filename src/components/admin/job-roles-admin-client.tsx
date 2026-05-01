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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

type JobRole = {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

type PhaseCode = { id: string; code: string; name: string; description?: string | null; hourlyRate?: any; isActive?: boolean }
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
  const [newPhase, setNewPhase] = useState({ code: '', name: '', hourlyRate: '' })

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId) || null, [roles, selectedRoleId])
  const sortedPhaseCodes = useMemo(
    () =>
      [...phaseCodes]
        .filter((c) => {
          const q = phaseSearch.trim().toLowerCase()
          if (!q) return true
          return `${c.code} ${c.name}`.toLowerCase().includes(q)
        })
        .sort((a, b) => a.code.localeCompare(b.code)),
    [phaseCodes, phaseSearch]
  )
  const sortedEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    return [...employees]
      .filter((e) => {
        if (!q) return true
        return `${e.name || ''} ${e.email}`.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const an = (a.name || a.email).toLowerCase()
        const bn = (b.name || b.email).toLowerCase()
        return an.localeCompare(bn)
      })
  }, [employees, employeeSearch])

  const filteredRoles = useMemo(() => {
    const q = categorySearch.trim().toLowerCase()
    const base = [...roles].sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return base
    return base.filter((r) => r.name.toLowerCase().includes(q))
  }, [roles, categorySearch])

  const load = async () => {
    setLoading(true)
    try {
      const [rolesRes, codesRes, usersRes] = await Promise.all([
        fetch('/api/admin/job-roles'),
        fetch('/api/admin/phase-codes'),
        fetch('/api/users?activeOnly=true'),
      ])
      const rolesJson = await rolesRes.json()
      const codesJson = await codesRes.json()
      const usersJson = await usersRes.json()
      if (!rolesRes.ok || !rolesJson?.success) throw new Error(rolesJson?.error || 'Failed to load categories')
      if (!codesRes.ok || !codesJson?.success) throw new Error(codesJson?.error || 'Failed to load phase codes')
      if (!usersRes.ok || !usersJson?.success) throw new Error(usersJson?.error || 'Failed to load employees')
      setRoles(rolesJson.data || [])
      setPhaseCodes(codesJson.data || [])
      setEmployees(usersJson.data || [])
      if (!selectedRoleId && Array.isArray(rolesJson.data) && rolesJson.data.length) {
        setSelectedRoleId(rolesJson.data[0].id)
      }
    } catch (e: any) {
      toast({ title: 'Could not load categories', description: e?.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const phaseLibrary = useMemo(() => {
    const q = phaseLibSearch.trim().toLowerCase()
    return [...phaseCodes]
      .filter((c) => {
        if (!q) return true
        return `${c.code} ${c.name} ${c.description || ''}`.toLowerCase().includes(q)
      })
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [phaseCodes, phaseLibSearch])

  const loadRoleCodes = async (roleId: string) => {
    try {
      const res = await fetch(`/api/admin/job-roles/${roleId}`)
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load role')
      const codes = Array.isArray(json?.data?.phaseCodes) ? (json.data.phaseCodes as PhaseCode[]) : []
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="border border-slate-200 shadow-md lg:col-span-4">
          <CardHeader className="border-b py-3 px-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Categories</p>
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
              <Tabs defaultValue="phase-codes">
                <TabsList>
                  <TabsTrigger value="phase-codes">Phase codes</TabsTrigger>
                  <TabsTrigger value="employees">Employees</TabsTrigger>
                  <TabsTrigger value="manage">Manage phase codes</TabsTrigger>
                </TabsList>

                <TabsContent value="phase-codes" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Input value={phaseSearch} onChange={(e) => setPhaseSearch(e.target.value)} placeholder="Search phase codes…" className="max-w-sm" />
                    <Button variant="outline" onClick={() => void saveRoleCodes()} disabled={saving}>
                      Save phase codes
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
                          <span className="font-mono">{c.code}</span>
                          <span className="text-slate-600 truncate">{c.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="employees" className="mt-4 space-y-3">
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
                </TabsContent>

                <TabsContent value="manage" className="mt-4 space-y-3">
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
                      <Button
                        onClick={async () => {
                          setSaving(true)
                          try {
                            const rate = newPhase.hourlyRate.trim() === '' ? null : Number(newPhase.hourlyRate)
                            const res = await fetch('/api/admin/phase-codes', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: newPhase.code, name: newPhase.name, hourlyRate: rate, isActive: true }),
                            })
                            const json = await res.json().catch(() => ({}))
                            if (!res.ok || !json?.success) throw new Error(json?.error || 'Create failed')
                            toast({ title: 'Phase code created' })
                            setNewPhase({ code: '', name: '', hourlyRate: '' })
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
                        <p className="text-sm font-semibold">Phase codes library</p>
                        <Input
                          value={phaseLibSearch}
                          onChange={(e) => setPhaseLibSearch(e.target.value)}
                          placeholder="Search…"
                          className="max-w-sm"
                        />
                      </div>
                      <div className="max-h-[520px] overflow-auto divide-y">
                        {phaseLibrary.map((c) => (
                          <div key={c.id} className="py-2 flex items-center gap-2">
                            <div className="w-[80px] font-mono">{c.code}</div>
                            <Input
                              className="h-8"
                              value={c.name}
                              onChange={(e) => setPhaseCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                            />
                            <Input
                              className="h-8 w-[120px]"
                              value={c.hourlyRate != null ? String(c.hourlyRate) : ''}
                              onChange={(e) =>
                                setPhaseCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, hourlyRate: e.target.value } : x)))
                              }
                              placeholder="Cost/hr"
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
                                  const res = await fetch(`/api/admin/phase-codes/${c.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      name: String(c.name || '').trim(),
                                      hourlyRate: rateVal,
                                      isActive: Boolean(c.isActive ?? true),
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
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

