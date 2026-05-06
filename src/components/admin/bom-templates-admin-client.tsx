'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Search, UploadCloud } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { dashboardUi } from '@/components/layout/dashboard-ui'

type TemplateRow = {
  id: string
  name: string
  notes: string | null
  tags: string | null
  status: string
  partsCount: number
  updatedAt: string
}

export function BomTemplatesAdminClient() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [search, setSearch] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sourceBomId, setSourceBomId] = useState('')
  const [templateName, setTemplateName] = useState('')

  const [loadOpen, setLoadOpen] = useState(false)
  const [loadingInto, setLoadingInto] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [targetQuoteId, setTargetQuoteId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bom-templates')
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load templates')
      setTemplates((json.data || []) as TemplateRow[])
    } catch (e: unknown) {
      setTemplates([])
      toast({
        title: 'Could not load BOM templates',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return templates
    return templates.filter((t) => t.name.toLowerCase().includes(s) || (t.notes || '').toLowerCase().includes(s))
  }, [templates, search])

  const openLoad = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setTargetQuoteId('')
    setLoadOpen(true)
  }

  return (
    <div className={dashboardUi.pageWrap}>
      <div className={dashboardUi.sectionGap}>
        <div className={dashboardUi.toolbarRow}>
          <div className={dashboardUi.searchInputWrap}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="pl-10 min-h-[44px]"
            />
          </div>
          <Button
            onClick={() => {
              setSourceBomId('')
              setTemplateName('')
              setCreateOpen(true)
            }}
            className={dashboardUi.primaryButton}
          >
            <Plus className="h-4 w-4 mr-2" />
            New template from BOM
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader />
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading templates…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-600 py-8">No templates found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={dashboardUi.tableHead}>Name</TableHead>
                    <TableHead className={dashboardUi.tableHead}>Parts</TableHead>
                    <TableHead className={dashboardUi.tableHead}>Updated</TableHead>
                    <TableHead className={dashboardUi.tableHead}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="tabular-nums">{t.partsCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(t.updatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openLoad(t.id)}>
                          <UploadCloud className="h-4 w-4 mr-2" />
                          Load into quote
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create template from existing BOM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source BOM ID</Label>
              <Input value={sourceBomId} onChange={(e) => setSourceBomId(e.target.value)} placeholder="cuid…" />
            </div>
            <div className="space-y-2">
              <Label>Template name</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Standard skid BOM" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setCreating(true)
                try {
                  const res = await fetch('/api/admin/bom-templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sourceBomId, name: templateName }),
                  })
                  const json = await res.json()
                  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to create template')
                  toast({ title: 'Template created' })
                  setCreateOpen(false)
                  await load()
                } catch (e: unknown) {
                  toast({
                    title: 'Could not create template',
                    description: e instanceof Error ? e.message : undefined,
                    variant: 'destructive',
                  })
                } finally {
                  setCreating(false)
                }
              }}
              disabled={creating || !sourceBomId.trim() || !templateName.trim()}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Load template into quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Target Quote ID</Label>
            <Input value={targetQuoteId} onChange={(e) => setTargetQuoteId(e.target.value)} placeholder="cuid…" />
            <div className="text-xs text-muted-foreground">This replaces existing quote BOM lines.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadOpen(false)} disabled={loadingInto}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedTemplateId) return
                setLoadingInto(true)
                try {
                  const res = await fetch(`/api/admin/bom-templates/${selectedTemplateId}/load-into-quote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quoteId: targetQuoteId, replaceExisting: true }),
                  })
                  const json = await res.json()
                  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load template')
                  toast({ title: 'Template loaded into quote BOM' })
                  setLoadOpen(false)
                } catch (e: unknown) {
                  toast({
                    title: 'Could not load template',
                    description: e instanceof Error ? e.message : undefined,
                    variant: 'destructive',
                  })
                } finally {
                  setLoadingInto(false)
                }
              }}
              disabled={loadingInto || !selectedTemplateId || !targetQuoteId.trim()}
            >
              {loadingInto ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

