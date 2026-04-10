'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, RotateCcw } from 'lucide-react'

interface CompactTimeSelectorProps {
  regularHours: number
  overtimeHours: number
  onRegularHoursChange: (hours: number) => void
  onOvertimeHoursChange: (hours: number) => void
  disabled?: boolean
  className?: string
}

export function CompactTimeSelector({
  regularHours,
  overtimeHours,
  onRegularHoursChange,
  onOvertimeHoursChange,
  disabled = false,
  className = ''
}: CompactTimeSelectorProps) {
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakDuration, setBreakDuration] = useState('none') // 'none', '15', '30', '60', etc.
  const [isOvertime, setIsOvertime] = useState(false) // New overtime selector
  const [calculatedRegular, setCalculatedRegular] = useState(0)
  const [calculatedOvertime, setCalculatedOvertime] = useState(0)
  const [calculatedTotal, setCalculatedTotal] = useState(0)

  // Generate time options for full 24-hour day (every 15 minutes)
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) { // 12 AM to 11:45 PM
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
        options.push({ value: timeString, label: displayTime })
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // Format break duration for display
  const formatBreakDuration = (minutes: string) => {
    if (minutes === 'none') return { hours: 0, minutes: 0 }
    const totalMins = parseInt(minutes)
    const hours = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    return { hours, minutes: mins }
  }

  // Handle break duration changes
  const handleBreakChange = (deltaMinutes: number) => {
    let currentMins = breakDuration === 'none' ? 0 : parseInt(breakDuration)
    let newMins = currentMins + deltaMinutes
    newMins = Math.max(0, newMins)
    setBreakDuration(newMins === 0 ? 'none' : newMins.toString())
  }

  // Calculate hours between two times
  const calculateHours = (start: string, end: string, breakMins: string, isOT: boolean) => {
    if (!start || !end) return { regular: 0, overtime: 0, total: 0 }

    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    
    // Convert to minutes
    let startMinutes = startHour * 60 + startMinute
    let endMinutes = endHour * 60 + endMinute
    
    // Handle overnight shifts (end time is next day)
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60 // Add 24 hours
    }
    
    // Calculate total minutes worked
    let totalMinutes = endMinutes - startMinutes
    
    // Subtract break time if provided
    if (breakMins !== 'none') {
      totalMinutes = Math.max(0, totalMinutes - parseInt(breakMins))
    }
    
    // Convert back to hours
    const totalHours = totalMinutes / 60
    
    // Assign to regular or overtime based on selector
    let regular = 0
    let overtime = 0
    
    if (isOT) {
      overtime = totalHours
    } else {
      regular = totalHours
    }
    
    return { regular, overtime, total: totalHours }
  }

  // Check if end time is valid (after start time)
  const isEndTimeValid = (start: string, end: string) => {
    if (!start || !end) return true
    
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    // For overnight shifts, end time should be significantly different from start time
    // Allow end time to be earlier in the day (overnight shift) but not the same time
    if (endMinutes === startMinutes) return false
    
    // For same-day shifts, end time must be after start time
    if (endMinutes > startMinutes) {
      // Same day - end time must be after start time
      return true
    } else {
      // Potential overnight shift - allow it (end time is earlier in the day)
      return true
    }
  }

  // Check if a specific end time option should be disabled
  const isEndTimeOptionDisabled = (start: string, endOption: string) => {
    if (!start) return false
    
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = endOption.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    // Disable if it's the same time as start time
    if (endMinutes === startMinutes) return true
    
    // For same-day shifts, disable times before start time
    if (endMinutes < startMinutes) return true
    
    return false
  }

  // Update calculations when times change
  useEffect(() => {
    const { regular, overtime, total } = calculateHours(startTime, endTime, breakDuration, isOvertime)
    setCalculatedRegular(regular)
    setCalculatedOvertime(overtime)
    setCalculatedTotal(total)
    
    // Update parent component
    onRegularHoursChange(regular)
    onOvertimeHoursChange(overtime)
  }, [startTime, endTime, breakDuration, isOvertime])

  // Format hours for display
  const formatHours = (hours: number) => {
    if (hours === 0) return '0:00'
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`
  }

  // Clear all inputs
  const handleClear = () => {
    setStartTime('')
    setEndTime('')
    setBreakDuration('none')
    setIsOvertime(false)
    setCalculatedRegular(0)
    setCalculatedOvertime(0)
    setCalculatedTotal(0)
    onRegularHoursChange(0)
    onOvertimeHoursChange(0)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Time Selectors - Compact */}
      <div className="grid grid-cols-2 gap-1">
        <div>
          <Select value={startTime} onValueChange={setStartTime} disabled={disabled}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Start" />
            </SelectTrigger>
            <SelectContent className="max-h-32">
              {timeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
          <div>
            <Select 
              value={endTime} 
              onValueChange={setEndTime} 
              disabled={disabled}
            >
              <SelectTrigger className={`h-7 text-xs ${
                startTime && endTime && !isEndTimeValid(startTime, endTime) 
                  ? 'border-red-300 bg-red-50' 
                  : ''
              }`}>
                <SelectValue placeholder="End" />
              </SelectTrigger>
              <SelectContent className="max-h-32">
                {timeOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    disabled={startTime && isEndTimeOptionDisabled(startTime, option.value)}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {startTime && endTime && !isEndTimeValid(startTime, endTime) && (
              <div className="mt-1 text-xs text-red-600">
                ⚠️ Invalid end time
              </div>
            )}
          </div>
      </div>

        {/* Break and Overtime - Compact */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
            <div className="flex items-center justify-center gap-2">
              {/* Hours Display */}
              <div className="flex flex-col items-center gap-1">
                <div className="h-6 w-7 px-1 text-xs font-bold border border-blue-200 rounded flex items-center justify-center bg-white shadow-sm">
                  {formatBreakDuration(breakDuration).hours}
                </div>
                <span className="text-xs text-gray-600">h</span>
              </div>
              
              {/* Minutes Display */}
              <div className="flex flex-col items-center gap-1">
                <div className="h-6 w-7 px-1 text-xs font-bold border border-blue-200 rounded flex items-center justify-center bg-white shadow-sm">
                  {formatBreakDuration(breakDuration).minutes.toString().padStart(2, '0')}
                </div>
                <span className="text-xs text-gray-600">m</span>
              </div>
              
              {/* Up/Down Buttons */}
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleBreakChange(15)}
                  disabled={disabled}
                  className="h-4 w-5 text-xs p-0 hover:bg-blue-50 hover:border-blue-300"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleBreakChange(-15)}
                  disabled={disabled || breakDuration === 'none' || parseInt(breakDuration) <= 0}
                  className="h-4 w-5 text-xs p-0 hover:bg-blue-50 hover:border-blue-300"
                >
                  ↓
                </Button>
              </div>
            </div>
          </div>

        <div>
          <Select 
            value={isOvertime ? 'overtime' : 'regular'} 
            onValueChange={(value) => setIsOvertime(value === 'overtime')} 
            disabled={disabled}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="max-h-32">
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="overtime">OT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

        {/* Clear Button - Compact */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="h-6 px-3 text-xs hover:bg-gray-100"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>

      {/* Current Values Display - Compact */}
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Reg:</span>
          <span className="font-medium">{formatHours(regularHours)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">OT:</span>
          <span className="font-medium">{formatHours(overtimeHours)}</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span className="text-gray-800 font-bold">Total:</span>
          <span className="text-blue-600 font-bold">{formatHours(regularHours + overtimeHours)}</span>
        </div>
      </div>
    </div>
  )
}