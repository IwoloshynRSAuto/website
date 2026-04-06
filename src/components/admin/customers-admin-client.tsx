'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, Pencil, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { dashboardUi } from '@/components/layout/dashboard-ui'

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  fileLink: string | null
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  fileLink: '',
}

export function CustomersAdminClient() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    try {
      const qs = showInactive ? '' : '?activeOnly=true'
      const res = await fetch(`/api/customers${qs}`)
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load customers')
      setCustomers((json.data || []) as Customer[])
    } catch (e: unknown) {
      toast({
        title: 'Could not load customers',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      fileLink: c.fileLink || '',
    })
    setDialogOpen(true)
  }

  const save = async () => {
    const name = form.name.trim()
    if (!name) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const body = {
        name,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        fileLink: form.fileLink.trim() || null,
      }
      const url = editing ? `/api/customers/${editing.id}` : '/api/customers'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Save failed')
      }
      toast({ title: editing ? 'Customer updated' : 'Customer created' })
      setDialogOpen(false)
      await load()
    } catch (e: unknown) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c: Customer) => {
    try {
      const res = await fetch(`/api/customers/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.isActive }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Update failed')
      toast({ title: !c.isActive ? 'Customer reactivated' : 'Customer deactivated' })
      await load()
    } catch (e: unknown) {
      toast({
        title: 'Could not update',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    }
  }

  const norm = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!norm) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(norm) ||
        (c.email || '').toLowerCase().includes(norm) ||
        (c.phone || '').toLowerCase().includes(norm) ||
        (c.address || '').toLowerCase().includes(norm)
    )
  }, [customers, norm])

  return (
    <div className="space-y-4">
      <div className={dashboardUi.toolbarRow}>
        <div className={dashboardUi.searchInputWrap}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button variant="outline" onClick={() => setShowInactive((v) => !v)} disabled={loading}>
            {showInactive ? 'Active only' : 'Include inactive'}
          </Button>
          <Button className={dashboardUi.primaryButton} onClick={openNew} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Add customer
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-md">
        <CardHeader className="border-b py-3 px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Customers</p>
          <p className="text-sm text-slate-600">{loading ? 'Loading…' : `${filtered.length} result(s)`}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={dashboardUi.tableHead}>Name</TableHead>
                  <TableHead className={dashboardUi.tableHead}>Email</TableHead>
                  <TableHead className={dashboardUi.tableHead}>Phone</TableHead>
                  <TableHead className={dashboardUi.tableHead}>Status</TableHead>
                  <TableHead className={`${dashboardUi.tableHead} text-right`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="text-sm">
                    <TableCell className="py-2 px-3 font-medium">{c.name}</TableCell>
                    <TableCell className="py-2 px-3 text-slate-600">{c.email || '—'}</TableCell>
                    <TableCell className="py-2 px-3 text-slate-600">{c.phone || '—'}</TableCell>
                    <TableCell className="py-2 px-3">
                      {c.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-900">Active</Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-800">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void toggleActive(c)}>
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500 text-sm">
                      No customers found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit customer' : 'New customer'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Name</Label>
              <Input
                id="cust-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Phone</Label>
              <Input
                id="cust-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-addr">Address</Label>
              <Input
                id="cust-addr"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-link">File / link</Label>
              <Input
                id="cust-link"
                value={form.fileLink}
                onChange={(e) => setForm((f) => ({ ...f, fileLink: e.target.value }))}
                placeholder="Optional URL or path"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving} className={dashboardUi.primaryButton}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
