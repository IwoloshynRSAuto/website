'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

type Mode = 'create' | 'edit'

type Employee = {
  id: string
  name: string | null
  email: string
  role: 'USER' | 'MANAGER' | 'ADMIN'
  jobRoleId?: string | null
  isActive: boolean
  position: string | null
  phone: string | null
  wage: number | null
}

const ROLE_VALUES = ['USER', 'MANAGER', 'ADMIN'] as const

function normalizeRole(value: unknown): (typeof ROLE_VALUES)[number] {
  const u = String(value ?? 'USER').toUpperCase()
  return (ROLE_VALUES as readonly string[]).includes(u) ? (u as (typeof ROLE_VALUES)[number]) : 'USER'
}

export function EmployeeEditClient({ mode, userId }: { mode: Mode; userId?: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [jobRoles, setJobRoles] = useState<Array<{ id: string; name: string; isActive: boolean }>>([])
  const [form, setForm] = useState<Partial<Employee>>({
    name: '',
    email: '',
    role: 'USER',
    jobRoleId: null,
    isActive: true,
    position: null,
    phone: null,
    wage: null,
  })

  useEffect(() => {
    if (mode !== 'edit' || !userId) return
    const run = async () => {
      setLoading(true)
      try {
        const [res, rolesRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch('/api/admin/job-roles'),
        ])
        if (!res.ok) throw new Error('Failed to load employee')
        const data = (await res.json()) as Employee
        const rolesJson = await rolesRes.json().catch(() => null)
        if (!rolesRes.ok || !rolesJson?.success) throw new Error(rolesJson?.error || 'Failed to load job roles')

        setJobRoles(Array.isArray(rolesJson.data) ? rolesJson.data : [])

        setForm({
          ...data,
          role: normalizeRole(data.role),
          jobRoleId: (data as any).jobRoleId ?? null,
        })
      } catch (e: any) {
        toast({ title: 'Could not load employee', description: e?.message, variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [mode, userId, toast])

  const save = async () => {
    setSaving(true)
    try {
      const body =
        mode === 'create'
          ? {
              name: form.name,
              email: form.email,
              role: form.role,
              position: form.position || null,
              phone: form.phone || null,
              wage: form.wage ?? null,
            }
          : {
              name: form.name,
              email: form.email,
              role: form.role,
              position: form.position || null,
              phone: form.phone || null,
              wage: form.wage ?? null,
              isActive: form.isActive,
            }

      const res = await fetch(mode === 'create' ? '/api/users' : `/api/users/${userId}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Save failed')

      // Keep Job Role assignment in sync even if admin forgets to click "Save phase access"
      if (mode === 'edit' && userId) {
        const roleRes = await fetch(`/api/admin/users/${userId}/job-role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobRoleId: form.jobRoleId ?? null }),
        })
        const roleJson = await roleRes.json().catch(() => ({}))
        if (!roleRes.ok || !roleJson?.success) {
          throw new Error(roleJson?.error || 'Failed to save job role')
        }
      }

      toast({ title: 'Saved' })
      router.push('/dashboard/admin/employees')
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Delete failed')
      toast({ title: 'Employee deleted' })
      router.push('/dashboard/admin/employees')
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Could not delete', description: e?.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border border-slate-200 shadow-md">
      <CardHeader className="border-b py-3 px-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">
          {mode === 'create' ? 'New employee' : 'Employee details'}
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {loading ? (
          <div className="text-sm text-slate-600">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={form.email ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={normalizeRole(form.role)}
                  onValueChange={(v) => setForm((p) => ({ ...p, role: v as Employee['role'] }))}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="MANAGER">MANAGER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === 'edit' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="jobRole">Category</Label>
                  <Select value={String(form.jobRoleId ?? '')} onValueChange={(v) => setForm((p) => ({ ...p, jobRoleId: v || null }))}>
                    <SelectTrigger id="jobRole">
                      <SelectValue placeholder="(none)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">(none)</SelectItem>
                      {jobRoles
                        .filter((r) => r.isActive)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={form.position ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value || null }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone ?? ''} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value || null }))} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wage">Wage</Label>
                <Input
                  id="wage"
                  type="number"
                  step="0.01"
                  value={form.wage != null && Number.isFinite(form.wage) ? String(form.wage) : ''}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      wage: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            {mode === 'edit' ? (
              <div className="pt-2 border-t">
                <p className="text-sm text-slate-600">
                  Phase code access is controlled by the employee’s <span className="font-medium">Category</span>.
                </p>
              </div>
            ) : null}

            {mode === 'edit' ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={form.isActive ? 'outline' : 'default'}
                  onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                  disabled={saving}
                >
                  {form.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2 border-t">
              <div>
                {mode === 'edit' ? (
                  <Button type="button" variant="destructive" onClick={() => void remove()} disabled={saving}>
                    Delete employee
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void save()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

