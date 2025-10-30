'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, RotateCcw } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface TimeInputWithCalculationProps {
  regularHours: number
  overtimeHours: number
  onRegularHoursChange: (hours: number) => void
  onOvertimeHoursChange: (hours: number) => void
  disabled?: boolean
  className?: string
}

export function TimeInputWithCalculation({
  regularHours,
  overtimeHours,
  onRegularHoursChange,
  onOvertimeHoursChange,
  disabled = false,
  className = ''
}: TimeInputWithCalculationProps) {
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
    toast.success('Time inputs cleared!')
  }


  return (
    <div className={`space-y-4 ${className}`}>
      {/* Time Selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="start-time" className="text-sm font-medium text-gray-700">
            Start Time
          </Label>
          <Select value={startTime} onValueChange={setStartTime} disabled={disabled}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select start time" />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {timeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="end-time" className="text-sm font-medium text-gray-700">
            End Time
          </Label>
          <Select value={endTime} onValueChange={setEndTime} disabled={disabled}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select end time" />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {timeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

        {/* Break Duration and Overtime Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label htmlFor="break-duration" className="text-sm font-medium text-gray-700">
              Break Duration
            </Label>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-center gap-3">
                {/* Hours Display */}
                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-12 px-2 text-sm font-bold border-2 border-blue-200 rounded-md flex items-center justify-center bg-white shadow-sm">
                    {formatBreakDuration(breakDuration).hours}
                  </div>
                  <span className="text-xs font-medium text-gray-600">hrs</span>
                </div>
                
                {/* Minutes Display */}
                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-12 px-2 text-sm font-bold border-2 border-blue-200 rounded-md flex items-center justify-center bg-white shadow-sm">
                    {formatBreakDuration(breakDuration).minutes.toString().padStart(2, '0')}
                  </div>
                  <span className="text-xs font-medium text-gray-600">mins</span>
                </div>
                
                {/* Up/Down Buttons */}
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleBreakChange(15)}
                    disabled={disabled}
                    className="h-6 w-7 text-xs hover:bg-blue-50 hover:border-blue-300"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleBreakChange(-15)}
                    disabled={disabled || breakDuration === 'none' || parseInt(breakDuration) <= 0}
                    className="h-6 w-7 text-xs hover:bg-blue-50 hover:border-blue-300"
                  >
                    ↓
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center mt-2">
                Use ↑↓ arrows to adjust by 15-minute increments
              </div>
            </div>
          </div>

        <div>
          <Label htmlFor="overtime-selector" className="text-sm font-medium text-gray-700">
            Time Type
          </Label>
          <Select 
            value={isOvertime ? 'overtime' : 'regular'} 
            onValueChange={(value) => setIsOvertime(value === 'overtime')} 
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Regular" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="overtime">Overtime</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clear Button */}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
          className="h-8 px-3 text-xs hover:bg-gray-100"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Clear All
        </Button>
      </div>

      {/* Calculated Results */}
      {(startTime || endTime) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">Calculated Hours</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <div className="text-gray-600 mb-1">Regular</div>
              <div className="font-semibold text-blue-900">{formatHours(calculatedRegular)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600 mb-1">Overtime</div>
              <div className="font-semibold text-blue-900">{formatHours(calculatedOvertime)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600 mb-1">Total</div>
              <div className="font-semibold text-blue-900">{formatHours(calculatedTotal)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}