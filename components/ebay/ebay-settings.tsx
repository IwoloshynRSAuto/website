'use client'

import { useState, useEffect } from 'react'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Save, X, Settings as SettingsIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { ebayApi } from '@/lib/ebay-api'

interface Category {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

interface Location {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

interface Condition {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

interface TestStatus {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

type SettingType = 'category' | 'location' | 'condition' | 'testStatus'

export function EbaySettings() {
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [testStatuses, setTestStatuses] = useState<TestStatus[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<SettingType>('category')
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [catRes, locRes, condRes, testRes] = await Promise.all([
        ebayApi.settings.getCategories(),
        ebayApi.settings.getLocations(),
        ebayApi.settings.getConditions(),
        ebayApi.settings.getTestStatuses()
      ])
      setCategories(catRes.data.data || [])
      setLocations(locRes.data.data || [])
      setConditions(condRes.data.data || [])
      setTestStatuses(testRes.data.data || [])
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  function getCurrentList(type: SettingType): (Category | Location | Condition | TestStatus)[] {
    switch (type) {
      case 'category':
        return categories
      case 'location':
        return locations
      case 'condition':
        return conditions
      case 'testStatus':
        return testStatuses
    }
  }

  function setCurrentList(type: SettingType, items: (Category | Location | Condition | TestStatus)[]) {
    switch (type) {
      case 'category':
        setCategories(items as Category[])
        break
      case 'location':
        setLocations(items as Location[])
        break
      case 'condition':
        setConditions(items as Condition[])
        break
      case 'testStatus':
        setTestStatuses(items as TestStatus[])
        break
    }
  }

  function openCreateDialog(type: SettingType) {
    setDialogType(type)
    setDialogMode('create')
    setEditingId(null)
    setFormName('')
    setFormIsActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(type: SettingType, item: Category | Location | Condition | TestStatus) {
    setDialogType(type)
    setDialogMode('edit')
    setEditingId(item.id)
    setFormName(item.name)
    setFormIsActive(item.isActive)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setFormName('')
    setFormIsActive(true)
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Name is required')
      return
    }

    try {
      let response
      if (dialogMode === 'create') {
        if (dialogType === 'category') {
          response = await ebayApi.settings.createCategory({ name: formName.trim() })
        } else if (dialogType === 'location') {
          response = await ebayApi.settings.createLocation({ name: formName.trim() })
        } else if (dialogType === 'condition') {
          response = await ebayApi.settings.createCondition({ name: formName.trim() })
        } else {
          response = await ebayApi.settings.createTestStatus({ name: formName.trim() })
        }
        const newItem = response.data.data
        setCurrentList(dialogType, [...getCurrentList(dialogType), newItem])
        toast.success(`${dialogType === 'testStatus' ? 'Test Status' : dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} created successfully`)
      } else {
        if (!editingId) return
        if (dialogType === 'category') {
          response = await ebayApi.settings.updateCategory(editingId, { name: formName.trim(), isActive: formIsActive })
        } else if (dialogType === 'location') {
          response = await ebayApi.settings.updateLocation(editingId, { name: formName.trim(), isActive: formIsActive })
        } else if (dialogType === 'condition') {
          response = await ebayApi.settings.updateCondition(editingId, { name: formName.trim(), isActive: formIsActive })
        } else {
          response = await ebayApi.settings.updateTestStatus(editingId, { name: formName.trim(), isActive: formIsActive })
        }
        const updatedItem = response.data.data
        const currentList = getCurrentList(dialogType)
        setCurrentList(dialogType, currentList.map(item => item.id === editingId ? updatedItem : item))
        toast.success(`${dialogType === 'testStatus' ? 'Test Status' : dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} updated successfully`)
      }
      closeDialog()
    } catch (error: any) {
      console.error(`Failed to ${dialogMode} ${dialogType}:`, error)
      toast.error(error.response?.data?.error || `Failed to ${dialogMode} ${dialogType}`)
    }
  }

  async function handleDelete(type: SettingType, id: string) {
    if (!confirm(`Are you sure you want to delete this ${type === 'testStatus' ? 'test status' : type}?`)) {
      return
    }

    try {
      if (type === 'category') {
        await ebayApi.settings.deleteCategory(id)
      } else if (type === 'location') {
        await ebayApi.settings.deleteLocation(id)
      } else if (type === 'condition') {
        await ebayApi.settings.deleteCondition(id)
      } else {
        await ebayApi.settings.deleteTestStatus(id)
      }

      const currentList = getCurrentList(type)
      setCurrentList(type, currentList.filter(item => item.id !== id))
      toast.success(`${type === 'testStatus' ? 'Test Status' : type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`)
    } catch (error: any) {
      console.error(`Failed to delete ${type}:`, error)
      toast.error(error.response?.data?.error || `Failed to delete ${type}`)
    }
  }

  function getTypeLabel(type: SettingType): string {
    switch (type) {
      case 'category':
        return 'Category'
      case 'location':
        return 'Storage Location'
      case 'condition':
        return 'Condition'
      case 'testStatus':
        return 'Test Status'
    }
  }

  function renderTable(
    type: SettingType,
    items: (Category | Location | Condition | TestStatus)[],
    title: string
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Button
              size="sm"
              onClick={() => openCreateDialog(type)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {title.slice(0, -1)}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No {title.toLowerCase()} found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(type, item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(type, item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader>
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">eBay Settings</h1>
            <p className="text-sm text-gray-600">Manage categories, storage locations, and conditions</p>
          </div>
        </div>
      </DashboardHeader>

      <DashboardContent>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {renderTable('category', categories, 'Categories')}
            {renderTable('location', locations, 'Storage Locations')}
            {renderTable('condition', conditions, 'Conditions')}
            {renderTable('testStatus', testStatuses, 'Test Statuses')}
          </div>
        )}
      </DashboardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? `Add ${getTypeLabel(dialogType)}` : `Edit ${getTypeLabel(dialogType)}`}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' 
                ? `Create a new ${dialogType.toLowerCase()} for your eBay listings.`
                : `Update the ${dialogType.toLowerCase()} details.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="dialog-name">Name</Label>
              <Input
                id="dialog-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={`Enter ${dialogType.toLowerCase()} name`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formName.trim()) {
                    handleSave()
                  }
                }}
              />
            </div>
            {dialogMode === 'edit' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dialog-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="dialog-active" className="cursor-pointer">
                  Active
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {dialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardPageContainer>
  )
}
