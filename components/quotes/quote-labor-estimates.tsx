'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Save, Edit } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface LaborEstimate {
  id?: string
  laborCodeId: string
  laborCode: string
  laborName: string
  category: string
  hours: number
  hourlyRate: number
}

interface DisciplineGroup {
  discipline: string
  totalHours: number
  estimates: Array<{
    laborCode: string
    laborName: string
    hours: number
  }>
}

interface QuoteLaborEstimatesProps {
  quoteId: string
  initialEstimates?: DisciplineGroup[]
  laborCodes: Array<{
    id: string
    code: string
    name: string
    category: string
    hourlyRate: number
  }>
  onEstimatesUpdated?: () => void
}

export function QuoteLaborEstimates({ 
  quoteId, 
  initialEstimates = [], 
  laborCodes,
  onEstimatesUpdated 
}: QuoteLaborEstimatesProps) {
  const { toast } = useToast()
  const [estimates, setEstimates] = useState<LaborEstimate[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Convert initial estimates to editable format
    const laborEstimateMap = new Map<string, LaborEstimate>()
    
    initialEstimates.forEach((group) => {
      group.estimates.forEach((est) => {
        const laborCode = laborCodes.find(lc => lc.code === est.laborCode)
        if (laborCode) {
          const existing = laborEstimateMap.get(laborCode.id)
          if (existing) {
            existing.hours += est.hours
          } else {
            laborEstimateMap.set(laborCode.id, {
              laborCodeId: laborCode.id,
              laborCode: laborCode.code,
              laborName: laborCode.name,
              category: laborCode.category,
              hours: est.hours,
              hourlyRate: laborCode.hourlyRate,
            })
          }
        }
      })
    })

    // If no estimates, initialize with all labor codes at 0 hours
    if (laborEstimateMap.size === 0) {
      const groupedByCategory = new Map<string, LaborEstimate[]>()
      laborCodes.forEach(lc => {
        if (!groupedByCategory.has(lc.category)) {
          groupedByCategory.set(lc.category, [])
        }
        groupedByCategory.get(lc.category)!.push({
          laborCodeId: lc.id,
          laborCode: lc.code,
          laborName: lc.name,
          category: lc.category,
          hours: 0,
          hourlyRate: lc.hourlyRate,
        })
      })
      setEstimates(Array.from(groupedByCategory.values()).flat())
    } else {
      setEstimates(Array.from(laborEstimateMap.values()))
    }
  }, [initialEstimates, laborCodes])

  const groupedEstimates = estimates.reduce((acc, est) => {
    if (!acc[est.category]) {
      acc[est.category] = []
    }
    acc[est.category].push(est)
    return acc
  }, {} as Record<string, LaborEstimate[]>)

  const handleHoursChange = (laborCodeId: string, hours: number) => {
    setEstimates(prev => prev.map(est => 
      est.laborCodeId === laborCodeId 
        ? { ...est, hours: Math.max(0, hours) }
        : est
    ))
  }

  const handleAddLaborCode = () => {
    if (laborCodes.length === 0) return
    
    const firstCode = laborCodes[0]
    setEstimates(prev => [...prev, {
      laborCodeId: firstCode.id,
      laborCode: firstCode.code,
      laborName: firstCode.name,
      category: firstCode.category,
      hours: 0,
      hourlyRate: firstCode.hourlyRate,
    }])
  }

  const handleRemoveEstimate = (laborCodeId: string) => {
    setEstimates(prev => prev.filter(est => est.laborCodeId !== laborCodeId))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Note: This would need an API endpoint to save quote labor estimates
      // For now, we'll just show a message
      toast({
        title: 'Note',
        description: 'Labor estimates will be saved when quote is converted to job',
      })
      setIsEditing(false)
      if (onEstimatesUpdated) {
        onEstimatesUpdated()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save estimates',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const totalHours = estimates.reduce((sum, est) => sum + est.hours, 0)
  const totalCost = estimates.reduce((sum, est) => sum + (est.hours * est.hourlyRate), 0)

  const disciplines = ['Controls', 'Mechanical', 'Programming', 'Panel Build', 'FAT', 'Commissioning']
  const categoryMapping: Record<string, string> = {
    'Controls Engineering': 'Controls',
    'Mechanical Engineering': 'Mechanical',
    'Electrical Engineering': 'Programming',
    'Panel Build': 'Panel Build',
    'FAT': 'FAT',
    'Commissioning': 'Commissioning',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Estimated Labor by Discipline</CardTitle>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {disciplines.map((discipline) => {
            const categoryKey = Object.keys(categoryMapping).find(
              key => categoryMapping[key] === discipline
            ) || discipline
            
            const disciplineEstimates = estimates.filter(est => 
              est.category.includes(discipline) || 
              est.category === categoryKey ||
              est.laborName.toLowerCase().includes(discipline.toLowerCase())
            )

            if (disciplineEstimates.length === 0 && !isEditing) {
              return null
            }

            const disciplineTotal = disciplineEstimates.reduce((sum, est) => sum + est.hours, 0)
            const disciplineCost = disciplineEstimates.reduce((sum, est) => sum + (est.hours * est.hourlyRate), 0)

            return (
              <div key={discipline} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{discipline}</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-600">Hours: </span>
                      <span className="font-semibold">{disciplineTotal.toFixed(1)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Cost: </span>
                      <span className="font-semibold">${disciplineCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {disciplineEstimates.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Labor Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          {isEditing && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disciplineEstimates.map((est) => (
                          <TableRow key={est.laborCodeId}>
                            <TableCell className="font-mono">{est.laborCode}</TableCell>
                            <TableCell>{est.laborName}</TableCell>
                            <TableCell className="text-right">${est.hourlyRate.toFixed(2)}/hr</TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  value={est.hours}
                                  onChange={(e) => handleHoursChange(est.laborCodeId, parseFloat(e.target.value) || 0)}
                                  className="w-20 text-right"
                                />
                              ) : (
                                <span>{est.hours.toFixed(1)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${(est.hours * est.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            {isEditing && (
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveEstimate(est.laborCodeId)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : isEditing ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No labor codes added for this discipline
                  </div>
                ) : null}
              </div>
            )
          })}

          {/* Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold">Total</div>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-sm text-gray-600">Total Hours</div>
                  <div className="text-xl font-bold">{totalHours.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Cost</div>
                  <div className="text-xl font-bold">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

