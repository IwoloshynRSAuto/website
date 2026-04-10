'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { dashboardUi } from '@/components/layout/dashboard-ui'
import { cn } from '@/lib/utils'

type Employee = {
  id: string
  name: string | null
  email: string
  role: string
  isActive: boolean
  position: string | null
  phone: string | null
}

export function EmployeesAdminClient() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const url = showInactive ? '/api/users' : '/api/users?activeOnly=true'
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load employees')
      const rows = json.data
      setEmployees(Array.isArray(rows) ? (rows as Employee[]) : [])
    } catch (e: any) {
      toast({ title: 'Could not load employees', description: e?.message, variant: 'destructive' })
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive])

  const norm = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!norm) return employees
    return employees.filter(
      (e) =>
        (e.name || '').toLowerCase().includes(norm) ||
        (e.email || '').toLowerCase().includes(norm) ||
        (e.position || '').toLowerCase().includes(norm) ||
        (e.role || '').toLowerCase().includes(norm)
    )
  }, [employees, norm])

  return (
    <div className="space-y-4">
      <div className={dashboardUi.toolbarRow}>
        <div className={dashboardUi.searchInputWrap}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowInactive((v) => !v)} disabled={loading}>
            {showInactive ? 'Active only' : 'Include inactive'}
          </Button>
          <Button asChild className={dashboardUi.primaryButton}>
            <Link href="/dashboard/admin/employees/new">
              <Plus className="h-4 w-4 mr-2" />
              Add employee
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-md">
        <CardHeader className="border-b py-3 px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90">Employees</p>
          <p className="text-sm text-slate-600">{loading ? 'Loading…' : `${filtered.length} result(s)`}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={dashboardUi.tableHead}>Name</TableHead>
                  <TableHead className={dashboardUi.tableHead}>Email</TableHead>
                  <TableHead className={cn(dashboardUi.tableHead, 'whitespace-nowrap')}>Role</TableHead>
                  <TableHead className={cn(dashboardUi.tableHead, 'whitespace-nowrap')}>Status</TableHead>
                  <TableHead className={cn(dashboardUi.tableHead, 'text-right')}>Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="text-sm">
                    <TableCell className="py-2 px-3 font-medium">{e.name || '—'}</TableCell>
                    <TableCell className="py-2 px-3 text-slate-600">{e.email}</TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant="secondary">{e.role}</Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      {e.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-900">ACTIVE</Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-900">INACTIVE</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/admin/employees/${e.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

