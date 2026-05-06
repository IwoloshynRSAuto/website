'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

type Vendor = { id: string; name: string }

type PurchaseOrderItem = {
  id: string
  partId: string | null
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  receivedQuantity: number
}

type PurchaseOrder = {
  id: string
  poNumber: string
  status: string
  orderDate: string
  expectedDate?: string | null
  notes: string | null
  vendor: { id: string; name: string }
  items: PurchaseOrderItem[]
}

export function JobProcurementSection({ jobId }: { jobId: string }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [pos, setPos] = useState<PurchaseOrder[]>([])

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorLoading, setVendorLoading] = useState(false)

  const [newPoOpen, setNewPoOpen] = useState(false)
  const [newPoFromBomOpen, setNewPoFromBomOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [vendorId, setVendorId] = useState('')
  const [poNotes, setPoNotes] = useState('')
  const [poExpectedDate, setPoExpectedDate] = useState('')

  const [addItemOpen, setAddItemOpen] = useState(false)
  const [activePoId, setActivePoId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState({ description: '', quantity: '1', unitPrice: '0' })

  const [importOpen, setImportOpen] = useState(false)
  const [importPoId, setImportPoId] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<
    | {
        extractedCount: number
        proposedUpdates: Array<{
          raw: string
          matchedItemId: string
          matchScore: number
          matchedDescription: string | null
          currentUnitPrice: number | null
          proposedUnitPrice: number | null
        }>
      }
    | null
  >(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/purchase-orders`)
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load purchase orders')
      setPos((json.data || []) as PurchaseOrder[])
    } catch (e: unknown) {
      setPos([])
      toast({
        title: 'Could not load purchase orders',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadVendors = async () => {
    setVendorLoading(true)
    try {
      const res = await fetch('/api/vendors?activeOnly=true')
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load vendors')
      setVendors((json.data || []) as Vendor[])
    } catch {
      setVendors([])
    } finally {
      setVendorLoading(false)
    }
  }

  useEffect(() => {
    void load()
    void loadVendors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const totalOrdered = useMemo(() => {
    return pos.reduce((sum, po) => sum + po.items.reduce((s, it) => s + Number(it.totalPrice || 0), 0), 0)
  }, [pos])

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle>Procurement</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setVendorId('')
                setPoNotes('')
                setPoExpectedDate('')
                setNewPoFromBomOpen(true)
              }}
            >
              Create PO from BOM
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setVendorId('')
                setPoNotes('')
                setPoExpectedDate('')
                setNewPoOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New PO
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600 py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading purchase orders…
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {pos.length} PO(s) • Total ordered: <span className="font-semibold text-foreground">${totalOrdered.toFixed(2)}</span>
            </div>

            {pos.length === 0 ? (
              <div className="text-sm text-gray-600">No purchase orders yet.</div>
            ) : (
              <div className="space-y-6">
                {pos.map((po) => (
                  <div key={po.id} className="rounded-lg border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border-b bg-muted/20">
                      <div className="text-sm">
                        <span className="font-semibold">{po.poNumber}</span> • {po.vendor.name} • <span className="text-muted-foreground">{po.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Arrival</Label>
                          <Input
                            type="date"
                            className="h-8 w-[160px]"
                            value={po.expectedDate ? po.expectedDate.split('T')[0] : ''}
                            onChange={async (e) => {
                              try {
                                const res = await fetch(`/api/purchase-orders/${po.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ expectedDate: e.target.value || null }),
                                })
                                const json = await res.json().catch(() => ({}))
                                if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to update arrival date')
                                await load()
                              } catch (err: unknown) {
                                toast({
                                  title: 'Could not update arrival date',
                                  description: err instanceof Error ? err.message : undefined,
                                  variant: 'destructive',
                                })
                              }
                            }}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActivePoId(po.id)
                            setItemForm({ description: '', quantity: '1', unitPrice: '0' })
                            setAddItemOpen(true)
                          }}
                        >
                          Add item
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setImportPoId(po.id)
                            setImportFile(null)
                            setImportPreview(null)
                            setImportOpen(true)
                          }}
                        >
                          Import PDF
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      {po.items.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No items yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[90px] text-right">Qty</TableHead>
                                <TableHead className="w-[160px] text-right">Actual cost (unit)</TableHead>
                                <TableHead className="w-[140px] text-right">Total</TableHead>
                                <TableHead className="w-[140px] text-right">Received</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {po.items.map((it) => (
                                <TableRow key={it.id}>
                                  <TableCell className="text-sm">{it.description}</TableCell>
                                  <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      className="h-8 text-xs text-right tabular-nums"
                                      defaultValue={String(it.unitPrice)}
                                      inputMode="decimal"
                                      onBlur={async (e) => {
                                        const next = Math.max(0, Number(e.target.value) || 0)
                                        if (next === Number(it.unitPrice)) return
                                        try {
                                          const res = await fetch(`/api/purchase-orders/${po.id}/items/${it.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ unitPrice: next }),
                                          })
                                          const json = await res.json().catch(() => ({}))
                                          if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to update item cost')
                                          await load()
                                        } catch (err: unknown) {
                                          toast({
                                            title: 'Could not update item cost',
                                            description: err instanceof Error ? err.message : undefined,
                                            variant: 'destructive',
                                          })
                                        }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">${Number(it.totalPrice).toFixed(2)}</TableCell>
                                  <TableCell className="text-right tabular-nums">{it.receivedQuantity}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={newPoOpen} onOpenChange={setNewPoOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create purchase order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId} disabled={vendorLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={vendorLoading ? 'Loading…' : 'Select vendor'} />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={poNotes} onChange={(e) => setPoNotes(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Shipment arrival date</Label>
              <Input type="date" value={poExpectedDate} onChange={(e) => setPoExpectedDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPoOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setSaving(true)
                try {
                  const res = await fetch(`/api/jobs/${jobId}/purchase-orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vendorId, expectedDate: poExpectedDate || null, notes: poNotes || null }),
                  })
                  const json = await res.json()
                  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to create PO')
                  toast({ title: 'PO created' })
                  setNewPoOpen(false)
                  await load()
                } catch (e: unknown) {
                  toast({
                    title: 'Could not create PO',
                    description: e instanceof Error ? e.message : undefined,
                    variant: 'destructive',
                  })
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving || !vendorId}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addItemOpen}
        onOpenChange={(open) => {
          setAddItemOpen(open)
          if (!open) setActivePoId(null)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add PO item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={itemForm.description} onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input value={itemForm.quantity} onChange={(e) => setItemForm((p) => ({ ...p, quantity: e.target.value }))} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Unit price</Label>
                <Input value={itemForm.unitPrice} onChange={(e) => setItemForm((p) => ({ ...p, unitPrice: e.target.value }))} inputMode="decimal" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!activePoId) return
                setSaving(true)
                try {
                  const res = await fetch(`/api/purchase-orders/${activePoId}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      partId: null,
                      description: itemForm.description,
                      quantity: Math.max(1, Number(itemForm.quantity) || 1),
                      unitPrice: Math.max(0, Number(itemForm.unitPrice) || 0),
                    }),
                  })
                  const json = await res.json()
                  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to add item')
                  toast({ title: 'Item added' })
                  setAddItemOpen(false)
                  await load()
                } catch (e: unknown) {
                  toast({
                    title: 'Could not add item',
                    description: e instanceof Error ? e.message : undefined,
                    variant: 'destructive',
                  })
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving || !activePoId || !itemForm.description.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newPoFromBomOpen} onOpenChange={setNewPoFromBomOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create PO from Quote BOM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId} disabled={vendorLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={vendorLoading ? 'Loading…' : 'Select vendor'} />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">This duplicates the linked Quote BOM lines into PO items.</div>
            </div>
            <div className="space-y-2">
              <Label>Shipment arrival date</Label>
              <Input type="date" value={poExpectedDate} onChange={(e) => setPoExpectedDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={poNotes} onChange={(e) => setPoNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPoFromBomOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setSaving(true)
                try {
                  const res = await fetch(`/api/jobs/${jobId}/purchase-orders/from-bom`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      vendorId,
                      expectedDate: poExpectedDate || null,
                      notes: poNotes || null,
                    }),
                  })
                  const json = await res.json()
                  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to create PO from BOM')
                  toast({ title: 'PO created from BOM' })
                  setNewPoFromBomOpen(false)
                  await load()
                } catch (e: unknown) {
                  toast({
                    title: 'Could not create PO from BOM',
                    description: e instanceof Error ? e.message : undefined,
                    variant: 'destructive',
                  })
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving || !vendorId}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) {
            setImportPoId(null)
            setImportFile(null)
            setImportPreview(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import PDF into PO (no duplicates)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>PDF file</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setImportFile(f)
                  setImportPreview(null)
                }}
              />
              <div className="text-xs text-muted-foreground">
                This will match PDF lines to existing PO items and fill in missing/updated unit costs. It will not create new items.
              </div>
            </div>

            {importPreview ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Extracted {importPreview.extractedCount} line(s). Proposed {importPreview.proposedUpdates.length} update(s).
                </div>
                {importPreview.proposedUpdates.length === 0 ? (
                  <div className="text-sm">No confident matches found.</div>
                ) : (
                  <div className="max-h-[280px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Matched item</TableHead>
                          <TableHead className="w-[110px] text-right">Current</TableHead>
                          <TableHead className="w-[110px] text-right">Proposed</TableHead>
                          <TableHead className="w-[90px] text-right">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.proposedUpdates.map((u) => (
                          <TableRow key={`${u.matchedItemId}-${u.raw.slice(0, 20)}`}>
                            <TableCell className="text-sm">
                              <div className="font-medium">{u.matchedDescription || u.matchedItemId}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{u.raw}</div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {u.currentUnitPrice == null ? '—' : `$${Number(u.currentUnitPrice).toFixed(2)}`}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {u.proposedUnitPrice == null ? '—' : `$${Number(u.proposedUnitPrice).toFixed(2)}`}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{Number(u.matchScore).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={saving}>
              Close
            </Button>
            <Button
              variant="outline"
              disabled={saving || !importPoId || !importFile}
              onClick={async () => {
                if (!importPoId || !importFile) return
                setSaving(true)
                try {
                  const fd = new FormData()
                  fd.append('file', importFile)
                  const res = await fetch(`/api/purchase-orders/${importPoId}/import-pdf`, { method: 'POST', body: fd })
                  const json = await res.json()
                  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to preview import')
                  setImportPreview(json.data)
                } catch (e: unknown) {
                  toast({
                    title: 'Could not preview PDF import',
                    description: e instanceof Error ? e.message : undefined,
                    variant: 'destructive',
                  })
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Preview'}
            </Button>
            <Button
              disabled={saving || !importPoId || !importFile || !importPreview || importPreview.proposedUpdates.length === 0}
              onClick={async () => {
                if (!importPoId || !importFile) return
                setSaving(true)
                try {
                  const fd = new FormData()
                  fd.append('file', importFile)
                  const res = await fetch(`/api/purchase-orders/${importPoId}/import-pdf?apply=true`, { method: 'POST', body: fd })
                  const json = await res.json()
                  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to apply import')
                  toast({ title: `Imported ${json.data?.updatedCount ?? 0} update(s)` })
                  setImportOpen(false)
                  await load()
                } catch (e: unknown) {
                  toast({
                    title: 'Could not apply PDF import',
                    description: e instanceof Error ? e.message : undefined,
                    variant: 'destructive',
                  })
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

