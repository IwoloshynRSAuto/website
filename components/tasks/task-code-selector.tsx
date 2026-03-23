'use client'

import { useState, useMemo, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Search, ChevronsUpDown } from 'lucide-react'
import { TASK_CODES, TaskCode } from '@/lib/task-codes'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface TaskCodeSelectorProps {
  value?: string
  onChange: (code: string | null, description: string | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

interface TaskCodeFromAPI {
  id: string
  code: string
  description: string
  category: string
  isActive: boolean
}

export function TaskCodeSelector({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select task code...',
  className,
}: TaskCodeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [taskCodes, setTaskCodes] = useState<TaskCode[]>(TASK_CODES)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Try to load from API, fallback to static file
  useEffect(() => {
    const loadTaskCodes = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/task-codes?activeOnly=true')
        const data = await response.json()
        
        if (data.success && data.data && data.data.length > 0) {
          // Convert API format to TaskCode format
          const apiCodes: TaskCode[] = data.data
            .filter((tc: TaskCodeFromAPI) => tc.isActive)
            .map((tc: TaskCodeFromAPI) => ({
              code: tc.code,
              description: tc.description,
              category: tc.category as 'PM' | 'SV' | 'AD',
            }))
          setTaskCodes(apiCodes)
        }
      } catch (error) {
        console.warn('Failed to load task codes from API, using static file:', error)
        // Keep using static TASK_CODES
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTaskCodes()
  }, [])

  const selectedTaskCode = useMemo(() => {
    if (!value) return null
    return taskCodes.find(tc => tc.code === value) || null
  }, [value, taskCodes])

  // Filter task codes based on search query
  const filteredTaskCodes = useMemo(() => {
    if (!searchQuery.trim()) return taskCodes
    
    const query = searchQuery.toLowerCase()
    return taskCodes.filter(tc => 
      tc.code.toLowerCase().includes(query) || 
      tc.description.toLowerCase().includes(query)
    )
  }, [taskCodes, searchQuery])

  const handleSelect = (taskCode: TaskCode) => {
    onChange(taskCode.code, taskCode.description)
    setOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onChange(null, null)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor="task-code">Task Code</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <span className="truncate">
              {selectedTaskCode
                ? `${selectedTaskCode.code} — ${selectedTaskCode.description}`
                : placeholder}
            </span>
            <div className="flex items-center gap-2">
              {selectedTaskCode && !disabled && (
                <X
                  className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] p-0 max-h-[500px] flex flex-col" align="start">
          {/* Search Bar */}
          <div className="p-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search task codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Scrollable List */}
          <div className="overflow-y-auto overflow-x-hidden flex-1" style={{ maxHeight: '400px' }}>
            {isLoading ? (
              <div className="text-center py-8 text-sm text-gray-500">Loading task codes...</div>
            ) : filteredTaskCodes.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">No task codes found</div>
            ) : (
              <div className="p-1">
                {filteredTaskCodes.map((taskCode) => {
                  const isSelected = selectedTaskCode?.code === taskCode.code
                  return (
                    <button
                      key={taskCode.code}
                      type="button"
                      onClick={() => handleSelect(taskCode)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                        isSelected && "bg-blue-50 border border-blue-200"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-mono font-semibold text-sm">
                            {taskCode.code}
                          </span>
                          <span className="text-xs text-gray-600 truncate">
                            {taskCode.description}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="ml-2 flex items-center gap-1">
                            <span className="text-xs text-blue-600 font-medium">Selected</span>
                            <X className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selectedTaskCode && (
        <p className="text-xs text-gray-500">
          Selected: {selectedTaskCode.code} — {selectedTaskCode.description}
        </p>
      )}
    </div>
  )
}
