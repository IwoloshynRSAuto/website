'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { dashboardUi } from '@/components/layout/dashboard-ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { isDbExportShape, summarizeExportCounts } from '@/lib/admin/db-export-schema'
import { FileJson, FileSpreadsheet, Loader2, Terminal, Upload } from 'lucide-react'

async function downloadBlob(url: string, fallbackName: string) {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || res.statusText || 'Download failed')
  }
  const cd = res.headers.get('Content-Disposition')
  let filename = fallbackName
  const m = cd && /filename="([^"]+)"/.exec(cd)
  if (m?.[1]) filename = m[1]
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function DatabaseAdminClient() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busyJson, setBusyJson] = useState(false)
  const [busyXlsx, setBusyXlsx] = useState(false)
  const [busyImport, setBusyImport] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const runExport = async (format: 'json' | 'xlsx') => {
    const setBusy = format === 'json' ? setBusyJson : setBusyXlsx
    setBusy(true)
    try {
      await downloadBlob(`/api/admin/db/export?format=${format}`, `database-export.${format === 'json' ? 'json' : 'xlsx'}`)
      toast({ title: 'Export started', description: 'Your browser should download the file.' })
    } catch (e) {
      toast({
        title: 'Export failed',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const onPickImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const text = await f.text()
      const raw = JSON.parse(text) as unknown
      if (!isDbExportShape(raw)) {
        toast({
          title: 'Invalid file',
          description: 'JSON must include users, customers, jobs, laborCodes, timeEntries, and timesheetSubmissions arrays.',
          variant: 'destructive',
        })
        return
      }
      const counts = summarizeExportCounts(raw)
      const lines = counts
        ? Object.entries(counts)
            .map(([k, n]) => `${k}: ${n}`)
            .join(', ')
        : ''
      setPendingFile(f)
      setImportSummary(lines)
      setImportDialogOpen(true)
    } catch {
      toast({
        title: 'Could not read JSON',
        description: 'Choose a valid JSON export from this portal.',
        variant: 'destructive',
      })
    }
  }

  const runImport = async () => {
    if (!pendingFile) return
    setBusyImport(true)
    setImportDialogOpen(false)
    try {
      const form = new FormData()
      form.set('file', pendingFile, pendingFile.name)
      const res = await fetch('/api/admin/db/import', {
        method: 'POST',
        body: form,
        credentials: 'same-origin',
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; counts?: Record<string, number> }
      if (!res.ok || !data.success) {
        throw new Error(data.error || res.statusText || 'Import failed')
      }
      const c = data.counts
      const detail = c
        ? `Processed ${Object.entries(c)
            .map(([k, n]) => `${k}: ${n}`)
            .join(', ')}.`
        : 'Import completed.'
      toast({ title: 'Import completed', description: detail })
    } catch (e) {
      toast({
        title: 'Import failed',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setBusyImport(false)
      setPendingFile(null)
      setImportSummary(null)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Admin only</AlertTitle>
        <AlertDescription>
          Exports include sensitive business data. Store files securely and do not commit them to git.
        </AlertDescription>
      </Alert>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-hidden
        onChange={(e) => void onPickImportFile(e)}
      />

      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import JSON merge</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Rows are upserted by id: existing records with the same id are updated; new ids are inserted. This
                  does not delete other rows in the database.
                </p>
                {importSummary ? (
                  <p className="font-mono text-xs text-foreground">{importSummary}</p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void runImport()
              }}
            >
              {busyImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export / import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a snapshot (JSON or Excel) of core tables, or upload a JSON file from this portal to merge rows by
            id. Excel is export-only.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className={dashboardUi.primaryButton}
              disabled={busyJson}
              onClick={() => void runExport('json')}
            >
              {busyJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
              Download JSON
            </Button>
            <Button type="button" variant="outline" disabled={busyXlsx} onClick={() => void runExport('xlsx')}>
              {busyXlsx ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Download Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busyImport}
              onClick={() => fileInputRef.current?.click()}
            >
              {busyImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
