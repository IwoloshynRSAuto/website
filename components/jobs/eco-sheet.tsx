'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { FileText, Save, X, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface QuotedLabor {
  laborCodeId: string
  estimatedHours: number
}

interface LaborCode {
  id: string
  code: string
  name: string
  category: string
  hourlyRate: number
}

interface TimeEntry {
  id: string
  laborCodeId: string | null
  laborCode: {
    id: string
    code: string
    name: string
    category: string
    hourlyRate: number
  } | null
  regularHours: number
  overtimeHours: number
  totalHours: number
}

interface ECOSheetProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  jobNumber: string
  timeEntries: TimeEntry[]
  laborCodes: LaborCode[]
  quotedLabor: QuotedLabor[]
  onECOApplied: () => void
}

export function ECOSheet({ isOpen, onClose, jobId, jobNumber, timeEntries, laborCodes, quotedLabor, onECOApplied }: ECOSheetProps) {
  const [editedLabor, setEditedLabor] = useState<Array<{
    id: string
    laborCodeId: string
    hours: number
    isNew?: boolean
  }>>([])
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize edited labor with all labor codes, showing current quoted hours
  useEffect(() => {
    if (laborCodes.length > 0) {
      // Start with all available labor codes, showing current quoted hours
      const allLaborCodes = laborCodes.map(lc => {
        // Find current quoted hours for this labor code
        const quotedLaborEntry = quotedLabor.find(ql => ql.laborCodeId === lc.id)
        const currentHours = quotedLaborEntry ? quotedLaborEntry.estimatedHours : 0
        
        return {
          id: `labor-${lc.id}`,
          laborCodeId: lc.id,
          hours: currentHours, // Show current hours
          isNew: false
        }
      })

      setEditedLabor(allLaborCodes)
    }
  }, [laborCodes, quotedLabor])

  const handleHourChange = (laborId: string, hours: number) => {
    setEditedLabor(prev => prev.map(labor => 
      labor.id === laborId ? { ...labor, hours } : labor
    ))
  }

  const handleLaborCodeChange = (laborId: string, laborCodeId: string) => {
    setEditedLabor(prev => prev.map(labor => 
      labor.id === laborId ? { ...labor, laborCodeId } : labor
    ))
  }

  const addLaborCode = () => {
    const newId = `new-${Date.now()}`
    setEditedLabor(prev => [...prev, {
      id: newId,
      laborCodeId: laborCodes[0]?.id || '',
      hours: 0,
      isNew: true
    }])
  }

  const removeLaborCode = (laborId: string) => {
    setEditedLabor(prev => prev.filter(labor => labor.id !== laborId))
  }

  const getLaborCode = (laborCodeId: string) => {
    return laborCodes.find(lc => lc.id === laborCodeId)
  }

  const calculateTotals = () => {
    const totalHours = editedLabor.reduce((sum, labor) => sum + labor.hours, 0)
    const totalCost = editedLabor.reduce((sum, labor) => {
      const laborCode = getLaborCode(labor.laborCodeId)
      return sum + (labor.hours * (laborCode?.hourlyRate || 0))
    }, 0)
    return { totalHours, totalCost }
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the change')
      return
    }

    setIsSubmitting(true)
    try {
      const { totalHours, totalCost } = calculateTotals()
      
      // Calculate original totals from time entries
      const originalTotalHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
      const originalTotalCost = timeEntries.reduce((sum, entry) => {
        const laborCode = getLaborCode(entry.laborCodeId || '')
        return sum + (entry.totalHours * (laborCode?.hourlyRate || 0))
      }, 0)
      
      // Create ECO
      const ecoResponse = await fetch('/api/eco', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          oldHours: originalTotalHours,
          newHours: totalHours,
          oldCost: originalTotalCost,
          newCost: totalCost,
          reasonForChange: reason.trim(),
          laborChanges: editedLabor
        })
      })

      if (!ecoResponse.ok) {
        const error = await ecoResponse.json()
        throw new Error(error.error || 'Failed to create ECO')
      }

      const eco = await ecoResponse.json()

      // Apply ECO immediately
      const applyResponse = await fetch('/api/eco/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ecoId: eco.id })
      })

      if (!applyResponse.ok) {
        const error = await applyResponse.json()
        throw new Error(error.error || 'Failed to apply ECO')
      }

      toast.success('ECO submitted and applied successfully!')
      onClose()
      onECOApplied()
    } catch (error) {
      console.error('Error submitting ECO:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit ECO')
    } finally {
      setIsSubmitting(false)
    }
  }

  const { totalHours, totalCost } = calculateTotals()
  const originalTotalHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
  const originalTotalCost = timeEntries.reduce((sum, entry) => {
    const laborCode = getLaborCode(entry.laborCodeId || '')
    return sum + (entry.totalHours * (laborCode?.hourlyRate || 0))
  }, 0)

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-5xl max-h-screen overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-blue-600">
            Labor Hours - {jobNumber}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6 max-h-[calc(100vh-150px)] overflow-y-auto">
          {/* Reason for Change */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why these changes are needed..."
              rows={3}
              className="resize-none"
            />
          </div>

            {/* Labor Hours Table - Improved design */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-blue-600">ECO Hours Update</h3>
                <div className="flex items-baseline space-x-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {totalHours.toFixed(1)}
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    ${totalCost.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-600 mt-0.5">ℹ️</div>
                  <div>
                    <strong>How to use:</strong> Edit the hours for each labor code. The system will calculate the difference from the original quoted hours and apply the changes.
                  </div>
                </div>
              </div>
            
            {/* Table matching the Quoted Hours design */}
            <div className="border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-24" />
                  <col className="w-80" />
                  <col className="w-28" />
                  <col className="w-32" />
                  <col className="w-28" />
                </colgroup>
                <thead className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 z-10">
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <th className="py-4 px-4 text-left text-sm font-semibold text-gray-800 border-r border-gray-200">Code</th>
                    <th className="py-4 px-4 text-left text-sm font-semibold text-gray-800 border-r border-gray-200">Name</th>
                    <th className="py-4 px-4 text-left text-sm font-semibold text-gray-800 border-r border-gray-200">Rate</th>
                    <th className="py-4 px-4 text-left text-sm font-semibold text-gray-800 border-r border-gray-200">New Hours</th>
                    <th className="py-4 px-4 text-left text-sm font-semibold text-gray-800">New Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {editedLabor.map((labor) => {
                    const laborCode = getLaborCode(labor.laborCodeId)
                    const cost = labor.hours * (laborCode?.hourlyRate || 0)
                    const hasSubmittedHours = timeEntries.some(entry => entry.laborCodeId === labor.laborCodeId)
                    
                    // Get original hours for comparison
                    const originalEntry = quotedLabor.find(ql => ql.laborCodeId === labor.laborCodeId)
                    const originalHours = originalEntry ? originalEntry.estimatedHours : 0
                    const hoursChanged = labor.hours !== originalHours
                    
                    return (
                      <tr key={labor.id} className={`border-b hover:bg-gray-50 h-16 transition-colors ${hasSubmittedHours ? 'bg-blue-50' : ''} ${hoursChanged ? 'bg-green-50' : ''}`}>
                        <td className="py-4 px-4 font-medium font-mono text-sm align-middle border-r border-gray-200">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-700">{laborCode?.code || 'N/A'}</span>
                            {hoursChanged && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                Changed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm align-middle border-r border-gray-200">
                          <div className="text-gray-700">{laborCode?.name || 'Select labor code'}</div>
                          {originalHours > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Original: {originalHours.toFixed(1)}h
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm align-middle border-r border-gray-200">
                          <div className="text-gray-700 font-medium">${laborCode?.hourlyRate || 0}/hr</div>
                        </td>
                        <td className="py-4 px-4 align-middle border-r border-gray-200">
                          <div className="relative">
                            <input
                              type="number"
                              value={labor.hours}
                              onChange={(e) => handleHourChange(labor.id, parseFloat(e.target.value) || 0)}
                              className={`w-full h-10 px-4 py-2 border-2 rounded-lg text-sm text-right font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                hasSubmittedHours 
                                  ? 'border-blue-300 bg-blue-50' 
                                  : hoursChanged 
                                    ? 'border-green-300 bg-green-50' 
                                    : 'border-gray-300 hover:border-gray-400'
                              }`}
                              min="0"
                              step="0.5"
                              placeholder="Enter hours"
                            />
                            {hoursChanged && (
                              <div className="absolute -right-2 -top-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          <div className={`font-semibold text-sm ${cost > 0 ? "text-blue-600" : "text-gray-400"}`}>
                            ${cost.toLocaleString()}
                          </div>
                          {hoursChanged && originalHours > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Change: {labor.hours > originalHours ? '+' : ''}{(labor.hours - originalHours).toFixed(1)}h
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <SheetFooter className="flex gap-3 pt-6 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || totalHours === 0}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Submit & Apply ECO
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
