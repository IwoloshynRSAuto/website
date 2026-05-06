'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Search, Loader2, Pencil } from 'lucide-react'
import { dashboardUi } from '@/components/layout/dashboard-ui'

type LatestVendorPrice = {
  id: string
  vendorId: string
  vendorName: string
  price: number
  leadTimeDays: number | null
  effectiveDate: string
}

type PartRow = {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  category: string | null
  subcategory: string | null
  primarySource: string | null
  secondarySources: string | null
  purchasePrice: number | null
  updatedAt: string
  latestVendorPrice: LatestVendorPrice | null
}

type Vendor = {
  id: string
  name: string
  isActive: boolean
}

type VendorPrice = {
  id: string
  vendorId: string
  partId: string
  price: number
  leadTimeDays: number | null
  effectiveDate: string
  minimumOrderQuantity: number | null
  notes: string | null
  vendor: { id: string; name: string }
}

type PartDetail = {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  category: string | null
  subcategory: string | null
  primarySource: string | null
  secondarySources: string | null
  purchasePrice: number | null
  vendorPrices: VendorPrice[]
}

const emptyNewPart = {
  partNumber: '',
  manufacturer: '',
  description: '',
  category: '',
  subcategory: '',
}

export function PartsClient() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [parts, setParts] = useState<PartRow[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorsLoading, setVendorsLoading] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newPart, setNewPart] = useState(emptyNewPart)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<PartDetail | null>(null)

  const [priceForm, setPriceForm] = useState({
    vendorId: '',
    price: '',
    leadTimeDays: '',
    effectiveDate: '',
  })

  const loadVendors = async () => {
    setVendorsLoading(true)
    try {
      const res = await fetch('/api/vendors?activeOnly=true')
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load vendors')
      setVendors((json.data || []) as Vendor[])
    } catch (e: unknown) {
      setVendors([])
      toast({
        title: 'Could not load vendors',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setVendorsLoading(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (search.trim()) qs.set('search', search.trim())
      if (category.trim()) qs.set('category', category.trim())
      qs.set('limit', '500')

      const res = await fetch(`/api/parts?${qs.toString()}`)
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load parts')
      setParts((json.data || []) as PartRow[])
    } catch (e: unknown) {
      setParts([])
      toast({
        title: 'Could not load parts',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    void loadVendors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    const c = category.trim().toLowerCase()
    return parts.filter((p) => {
      const matchesSearch =
        !s ||
        p.partNumber.toLowerCase().includes(s) ||
        p.manufacturer.toLowerCase().includes(s) ||
        (p.description || '').toLowerCase().includes(s)
      const matchesCategory = !c || (p.category || '').toLowerCase() === c
      return matchesSearch && matchesCategory
    })
  }, [parts, search, category])

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of parts) {
      const c = (p.category || '').trim()
      if (c) set.add(c)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [parts])

  const openNew = () => {
    setNewPart(emptyNewPart)
    setDialogOpen(true)
  }

  const createPart = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partNumber: newPart.partNumber,
          manufacturer: newPart.manufacturer,
          description: newPart.description || null,
          category: newPart.category || null,
          subcategory: newPart.subcategory || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to create part')
      toast({ title: 'Part created' })
      setDialogOpen(false)
      await load()
    } catch (e: unknown) {
      toast({
        title: 'Could not create part',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const openDetail = async (partId: string) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    setPriceForm({ vendorId: '', price: '', leadTimeDays: '', effectiveDate: '' })
    try {
      const res = await fetch(`/api/parts/${partId}`)
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load part')
      setDetail(json.data as PartDetail)
    } catch (e: unknown) {
      toast({
        title: 'Could not load part',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const saveDetail = async () => {
    if (!detail) return
    setSaving(true)
    try {
      const res = await fetch(`/api/parts/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partNumber: detail.partNumber,
          manufacturer: detail.manufacturer,
          description: detail.description,
          category: detail.category,
          subcategory: detail.subcategory,
          primarySource: detail.primarySource,
          secondarySources: detail.secondarySources,
          purchasePrice: detail.purchasePrice,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to save part')
      toast({ title: 'Part saved' })
      await load()
    } catch (e: unknown) {
      toast({
        title: 'Could not save part',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const addVendorPrice = async () => {
    if (!detail) return
    if (!priceForm.vendorId || !priceForm.price) {
      toast({ title: 'Vendor and price required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/parts/${detail.id}/vendor-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: priceForm.vendorId,
          price: Number(priceForm.price),
          leadTimeDays: priceForm.leadTimeDays ? Number(priceForm.leadTimeDays) : null,
          effectiveDate: priceForm.effectiveDate || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to add vendor price')
      toast({ title: 'Vendor price added' })
      await openDetail(detail.id)
      await load()
    } catch (e: unknown) {
      toast({
        title: 'Could not add vendor price',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={dashboardUi.pageWrap}>
      <div className={dashboardUi.sectionGap}>
        <div className={dashboardUi.toolbarRow}>
          <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center">
            <div className={dashboardUi.searchInputWrap}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search parts (part #, manufacturer, description)"
                className="pl-10 min-h-[44px]"
              />
            </div>
            <div className="w-full sm:max-w-[240px]">
              <Label className="sr-only">Category</Label>
              <Select value={category || '__all__'} onValueChange={(v) => setCategory(v === '__all__' ? '' : v)}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={openNew} className={dashboardUi.primaryButton}>
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader />
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading parts…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-600 py-8">No parts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={dashboardUi.tableHead}>Part #</TableHead>
                    <TableHead className={dashboardUi.tableHead}>Manufacturer</TableHead>
                    <TableHead className={dashboardUi.tableHead}>Description</TableHead>
                    <TableHead className={dashboardUi.tableHead}>Category</TableHead>
                    <TableHead className={dashboardUi.tableHead}>Latest vendor</TableHead>
                    <TableHead className={dashboardUi.tableHead}>Latest price</TableHead>
                    <TableHead className={dashboardUi.tableHead}>Lead time</TableHead>
                    <TableHead className={dashboardUi.tableHead}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => void openDetail(p.id)}>
                      <TableCell className="font-mono text-xs">{p.partNumber}</TableCell>
                      <TableCell className="text-sm">{p.manufacturer}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[420px] truncate" title={p.description || ''}>
                        {p.description || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{p.category || '—'}</TableCell>
                      <TableCell className="text-sm">{p.latestVendorPrice?.vendorName || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {p.latestVendorPrice ? `$${p.latestVendorPrice.price.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.latestVendorPrice?.leadTimeDays != null ? `${p.latestVendorPrice.leadTimeDays}d` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            void openDetail(p.id)
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Part</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Part #</Label>
              <Input value={newPart.partNumber} onChange={(e) => setNewPart((p) => ({ ...p, partNumber: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input value={newPart.manufacturer} onChange={(e) => setNewPart((p) => ({ ...p, manufacturer: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Input value={newPart.description} onChange={(e) => setNewPart((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newPart.category || '__none__'}
                onValueChange={(v) => setNewPart((p) => ({ ...p, category: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Input value={newPart.subcategory} onChange={(e) => setNewPart((p) => ({ ...p, subcategory: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void createPart()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Part details</DialogTitle>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Part #</Label>
                  <Input value={detail.partNumber} onChange={(e) => setDetail((p) => (p ? { ...p, partNumber: e.target.value } : p))} />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input value={detail.manufacturer} onChange={(e) => setDetail((p) => (p ? { ...p, manufacturer: e.target.value } : p))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Description</Label>
                  <Input value={detail.description || ''} onChange={(e) => setDetail((p) => (p ? { ...p, description: e.target.value } : p))} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                <Select
                  value={detail.category || '__none__'}
                  onValueChange={(v) => setDetail((p) => (p ? { ...p, category: v === '__none__' ? null : v } : p))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Input value={detail.subcategory || ''} onChange={(e) => setDetail((p) => (p ? { ...p, subcategory: e.target.value } : p))} />
                </div>
              </div>

              <Card>
                <CardHeader />
                <CardContent className="space-y-3">
                  <div className="font-semibold">Vendor price history</div>
                  {detail.vendorPrices.length === 0 ? (
                    <div className="text-sm text-gray-600">No vendor prices yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className={dashboardUi.tableHead}>Vendor</TableHead>
                            <TableHead className={dashboardUi.tableHead}>Price</TableHead>
                            <TableHead className={dashboardUi.tableHead}>Lead time</TableHead>
                            <TableHead className={dashboardUi.tableHead}>Effective</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.vendorPrices.map((vp) => (
                            <TableRow key={vp.id}>
                              <TableCell className="text-sm">{vp.vendor.name}</TableCell>
                              <TableCell className="text-sm">${vp.price.toFixed(2)}</TableCell>
                              <TableCell className="text-sm">{vp.leadTimeDays != null ? `${vp.leadTimeDays}d` : '—'}</TableCell>
                              <TableCell className="text-sm">{new Date(vp.effectiveDate).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-3">
                    <div className="font-semibold">Add vendor price</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Vendor</Label>
                        <Input
                          value={
                            vendors.find((v) => v.id === priceForm.vendorId)?.name ||
                            (vendorsLoading ? 'Loading vendors…' : '')
                          }
                          placeholder={vendorsLoading ? 'Loading vendors…' : 'Type vendor name (must exist)'}
                          onChange={(e) => {
                            const name = e.target.value
                            const found = vendors.find((v) => v.name.toLowerCase() === name.trim().toLowerCase())
                            setPriceForm((p) => ({ ...p, vendorId: found?.id || '' }))
                          }}
                        />
                        <div className="text-xs text-gray-500">
                          Current vendors: {vendors.slice(0, 6).map((v) => v.name).join(', ')}
                          {vendors.length > 6 ? '…' : ''}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Price</Label>
                        <Input value={priceForm.price} onChange={(e) => setPriceForm((p) => ({ ...p, price: e.target.value }))} inputMode="decimal" />
                      </div>
                      <div className="space-y-1">
                        <Label>Lead time (days)</Label>
                        <Input value={priceForm.leadTimeDays} onChange={(e) => setPriceForm((p) => ({ ...p, leadTimeDays: e.target.value }))} inputMode="numeric" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Effective date (optional)</Label>
                        <Input type="date" value={priceForm.effectiveDate} onChange={(e) => setPriceForm((p) => ({ ...p, effectiveDate: e.target.value }))} />
                      </div>
                      <div className="flex items-end sm:col-span-2">
                        <Button onClick={() => void addVendorPrice()} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add price'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)} disabled={saving}>
              Close
            </Button>
            <Button onClick={() => void saveDetail()} disabled={saving || detailLoading || !detail}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

