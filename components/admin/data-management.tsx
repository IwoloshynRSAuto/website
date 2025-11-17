'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'
import { Download, Upload, Trash2, Database, XCircle } from 'lucide-react'

export function DataManagement() {
  const [isLoading, setIsLoading] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/export-data', {
        method: 'POST',
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `database-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('Data exported successfully!')
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file to import')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/admin/import-data', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        const imported = result.imported || {}
        const total = imported.total || 0
        
        let message = `Data imported successfully! Total records: ${total}`
        if (total > 0) {
          const details = []
          if (imported.users > 0) details.push(`${imported.users} users`)
          if (imported.customers > 0) details.push(`${imported.customers} customers`)
          if (imported.jobs > 0) details.push(`${imported.jobs} jobs`)
          if (imported.quotes > 0) details.push(`${imported.quotes} quotes`)
          if (imported.timeEntries > 0) details.push(`${imported.timeEntries} time entries`)
          if (details.length > 0) {
            message += ` (${details.join(', ')})`
          }
        }
        
        toast.success(message)
        setImportFile(null)
        // Reset file input
        const fileInput = document.getElementById('import-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        throw new Error('Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearApprovals = async () => {
    if (!confirm('⚠️ This will permanently delete all timesheet approvals (SUBMITTED, APPROVED, REJECTED). Are you sure?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/clear-approvals', {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Approvals cleared! Deleted ${result.deleted || 0} submissions, reset ${result.reset || 0} drafts.`)
        // Reload the page to refresh the approvals view
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Clear failed')
      }
    } catch (error: any) {
      console.error('Clear approvals error:', error)
      toast.error(error.message || 'Failed to clear approvals')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearDatabase = async () => {
    if (!confirm('⚠️ This will permanently delete ALL data in the database. Are you sure?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/clear-database', {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Database cleared successfully!')
      } else {
        throw new Error('Clear failed')
      }
    } catch (error) {
      console.error('Clear error:', error)
      toast.error('Failed to clear database')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-purple-600" />
          Data Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Section */}
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Export Data</h3>
            <p className="text-sm text-gray-600">
              Download a complete backup of all database records as a JSON file.
            </p>
          </div>
          <Button 
            onClick={handleExport} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Database
          </Button>
        </div>

        {/* Import Section */}
        <div className="space-y-3 border-t pt-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Import Data</h3>
            <p className="text-sm text-gray-600">
              Import data from a previously exported JSON file or SQLite database (.db) file. This will replace all existing data.
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="import-file" className="text-sm font-medium">Select file (JSON or .db)</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json,.db"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full sm:w-auto"
              />
            </div>
            <Button 
              onClick={handleImport} 
              disabled={isLoading || !importFile}
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
          </div>
        </div>

        {/* Clear Approvals Section */}
        <div className="space-y-3 border-t pt-6">
          <div>
            <h3 className="text-base font-semibold text-orange-600 mb-1">Clear Timesheet Approvals</h3>
            <p className="text-sm text-gray-600">
              Delete all timesheet submissions that are SUBMITTED, APPROVED, or REJECTED. This will make the approvals section appear empty.
            </p>
          </div>
          <Button 
            onClick={handleClearApprovals} 
            disabled={isLoading}
            variant="outline"
            className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Clear All Approvals
          </Button>
        </div>

        {/* Clear Database Section */}
        <div className="space-y-3 border-t pt-6">
          <div>
            <h3 className="text-base font-semibold text-red-600 mb-1">Danger Zone</h3>
            <p className="text-sm text-gray-600">
              Permanently delete all data from the database. This action cannot be undone.
            </p>
          </div>
          <Button 
            onClick={handleClearDatabase} 
            disabled={isLoading}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Database
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
