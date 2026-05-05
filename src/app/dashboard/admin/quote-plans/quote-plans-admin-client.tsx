'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RICKMASTER_ROWS, groupKeyForCode } from '@/lib/quote-plans/rickmaster'
import { cn } from '@/lib/utils'

type Phase = { id: string; code: string; name: string }
type PlanItem = { id: string; taskCode: string; description: string; sortOrder: number; laborCodeId: string | null }
type Plan = { id: string; name: string; description: string | null; isActive: boolean; isDefault: boolean; items: PlanItem[] }

export function QuotePlansAdminClient({
  initialPlans,
  phaseCodes,
}: {
  initialPlans: Plan[]
  phaseCodes: Phase[]
}) {
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [selectedId, setSelectedId] = useState<string>(initialPlans[0]?.id || '')
  const selected = useMemo(() => plans.find((p) => p.id === selectedId) || null, [plans, selectedId])

  const [name, setName] = useState(selected?.name || '')
  const [description, setDescription] = useState(selected?.description || '')
  const [search, setSearch] = useState('')
  const [customTaskCode, setCustomTaskCode] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customLaborCodeId, setCustomLaborCodeId] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ taskCode: string; description: string; sortOrder: number; laborCodeId: string | null }>>(
    () => (selected?.items || []).map((r) => ({ taskCode: r.taskCode, description: r.description, sortOrder: r.sortOrder, laborCodeId: r.laborCodeId }))
  )

  const loadSelected = (id: string) => {
    const p = plans.find((x) => x.id === id)
    setSelectedId(id)
    setName(p?.name || '')
    setDescription(p?.description || '')
    setCustomTaskCode('')
    setCustomDescription('')
    setCustomLaborCodeId(null)
    setItems((p?.items || []).map((r) => ({ taskCode: r.taskCode, description: r.description, sortOrder: r.sortOrder, laborCodeId: r.laborCodeId })))
  }

  const itemSet = useMemo(() => new Set(items.map((i) => i.taskCode.toUpperCase())), [items])
  const masterRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = RICKMASTER_ROWS
    if (!q) return rows
    return rows.filter((r) => r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
  }, [search])

  const grouped = useMemo(() => {
    const m = new Map<string, Array<{ code: string; description: string }>>()
    for (const r of masterRows) {
      const g = groupKeyForCode(r.code)
      const arr = m.get(g) || []
      arr.push({ code: r.code, description: r.description })
      m.set(g, arr)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [masterRows])

  const save = async () => {
    if (!selected) return
    try {
      const res = await fetch(`/api/admin/quote-plans/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          items: items
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((it, idx) => ({ ...it, sortOrder: idx })),
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      const updated = result.data as Plan
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      toast({ title: 'Saved' })
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' })
    }
  }

  const makeDefault = async () => {
    if (!selected) return
    try {
      const res = await fetch(`/api/admin/quote-plans/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      const updated = result.data as Plan
      setPlans((prev) => prev.map((p) => ({ ...p, isDefault: p.id === updated.id })))
      toast({ title: 'Default updated' })
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' })
    }
  }

  const createPlan = async () => {
    try {
      const res = await fetch('/api/admin/quote-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Plan ${plans.length + 1}` }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.success === false) throw new Error(result.error || 'Failed')
      const created = result.data as Plan
      setPlans((prev) => [created, ...prev])
      loadSelected(created.id)
      toast({ title: 'Created' })
    } catch (e: any) {
      toast({ title: 'Create failed', description: e?.message, variant: 'destructive' })
    }
  }

  const addItem = (row: { code: string; description: string }) => {
    const code = row.code.toUpperCase()
    if (itemSet.has(code)) return
    setItems((prev) => [
      ...prev,
      { taskCode: code, description: row.description, sortOrder: prev.length, laborCodeId: null },
    ])
  }

  const addCustomItem = () => {
    const code = customTaskCode.trim().toUpperCase()
    if (!code) return
    if (itemSet.has(code)) return
    const desc = customDescription.trim() || code
    setItems((prev) => [...prev, { taskCode: code, description: desc, sortOrder: prev.length, laborCodeId: customLaborCodeId }])
    setCustomTaskCode('')
    setCustomDescription('')
    setCustomLaborCodeId(null)
  }

  const removeItem = (taskCode: string) => {
    const code = taskCode.toUpperCase()
    setItems((prev) => prev.filter((x) => x.taskCode.toUpperCase() !== code))
  }

  const setItemLaborCode = (taskCode: string, laborCodeId: string | null) => {
    const code = taskCode.toUpperCase()
    setItems((prev) => prev.map((x) => (x.taskCode.toUpperCase() === code ? { ...x, laborCodeId } : x)))
  }

  const byTaskCode = useMemo(() => {
    const m = new Map<string, { laborCodeId: string | null }>()
    for (const it of items) m.set(it.taskCode.toUpperCase(), { laborCodeId: it.laborCodeId })
    return m
  }, [items])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quote plans</h1>
          <p className="text-sm text-muted-foreground mt-1">Templates that define which sub-phase codes appear on new quotes.</p>
        </div>
        <Button type="button" onClick={() => void createPlan()}>
          New plan
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Select plan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-center">
          <Select value={selectedId || '__none__'} onValueChange={(v) => loadSelected(v)}>
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Select a plan…" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.isDefault ? `${p.name} (default)` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={() => void makeDefault()} disabled={!selected}>
            Set default
          </Button>
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Edit plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-[360px] shrink-0 space-y-2">
                <Label>Search sub-phase codes</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PM070, skid, FAT, travel…" />
                <div className="text-xs text-muted-foreground">
                  Click a row to add it to this plan. Items are grouped by header like <span className="font-mono">PM010</span>.
                </div>
              </div>
              <div className="flex-1 rounded-lg border overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex justify-between">
                  <div>Master list (rickmaster)</div>
                  <div>{items.length} in plan</div>
                </div>
                <div className="max-h-[520px] overflow-auto">
                  {grouped.map(([g, rows]) => (
                    <div key={g} className="border-b">
                      <div className="px-3 py-2 font-semibold text-sm bg-muted/10">{g}</div>
                      {rows.map((r) => {
                        const included = itemSet.has(r.code.toUpperCase())
                        return (
                          <button
                            key={r.code}
                            type="button"
                            className={cn(
                              'w-full text-left px-3 py-2 text-sm hover:bg-muted/10 flex items-center justify-between gap-3',
                              included ? 'opacity-60' : ''
                            )}
                            onClick={() => addItem(r)}
                            disabled={included}
                            title={included ? 'Already in plan' : 'Add to plan'}
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-xs">{r.code}</div>
                              <div className="truncate">{r.description}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">{included ? 'Added' : 'Add'}</div>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Plan items (what shows on new quotes)</div>
              <div className="max-h-[520px] overflow-auto">
                {items.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No items yet. Add items from the master list above.</div>
                ) : (
                  items
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((it) => (
                      <div key={it.taskCode} className="flex items-center gap-2 px-3 py-2 border-t">
                        <div className="w-[140px] font-mono text-xs">{it.taskCode}</div>
                        <div className="flex-1 text-sm truncate">{it.description}</div>
                        <Select
                          value={it.laborCodeId || '__none__'}
                          onValueChange={(v) => setItemLaborCode(it.taskCode, v === '__none__' ? null : v)}
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue placeholder="Phase" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Auto</SelectItem>
                            {phaseCodes.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.code.slice(0, 2)} — {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => removeItem(it.taskCode)}>
                          Remove
                        </Button>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="text-sm font-medium">Add custom item</div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-3 space-y-1">
                  <Label>Task code</Label>
                  <Input value={customTaskCode} onChange={(e) => setCustomTaskCode(e.target.value)} placeholder="PM999-0100" />
                </div>
                <div className="md:col-span-5 space-y-1">
                  <Label>Description</Label>
                  <Input value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} placeholder="Optional (defaults to task code)" />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label>Phase mapping</Label>
                  <Select
                    value={customLaborCodeId || '__none__'}
                    onValueChange={(v) => setCustomLaborCodeId(v === '__none__' ? null : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Auto</SelectItem>
                      {phaseCodes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code.slice(0, 2)} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1">
                  <Button type="button" className="w-full" onClick={addCustomItem} disabled={!customTaskCode.trim()}>
                    Add
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Use this if you need a task code that isn’t in the master list.
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => void save()}>
                Save plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

