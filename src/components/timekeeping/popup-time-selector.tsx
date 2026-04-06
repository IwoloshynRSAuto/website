'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Clock, Calculator, RotateCcw, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface PopupTimeSelectorProps {
  regularHours: number
  overtimeHours: number
  onRegularHoursChange: (hours: number) => void
  onOvertimeHoursChange: (hours: number) => void
  disabled?: boolean
  className?: string
}

export function PopupTimeSelector({
  regularHours,
  overtimeHours,
  onRegularHoursChange,
  onOvertimeHoursChange,
  disabled = false,
  className = ''
}: PopupTimeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakDuration, setBreakDuration] = useState('none')
  const [isOvertime, setIsOvertime] = useState(false)
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
    newMins = Math.max(0, newMins) // Ensure it doesn't go below 0
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

  // Apply calculated hours
  const handleApply = () => {
    onRegularHoursChange(calculatedRegular)
    onOvertimeHoursChange(calculatedOvertime)
    setIsOpen(false)
    toast.success(`Applied: ${formatHours(calculatedRegular)} regular, ${formatHours(calculatedOvertime)} overtime`)
  }


  // Get display text for the trigger button
  const getDisplayText = () => {
    if (regularHours > 0 || overtimeHours > 0) {
      return `${formatHours(regularHours)} / ${formatHours(overtimeHours)}`
    }
    return 'Set Time'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={`h-12 text-base min-w-[100px] ${className}`}
          >
            <Clock className="h-4 w-4 mr-1" />
            {getDisplayText()}
          </Button>
        </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Time Entry
            </DialogTitle>
          </DialogHeader>
        
        <div className="space-y-6">
          {/* Time Selection Grid */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Start Time</h3>
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {timeOptions.map((option) => (
                  <Button
                    key={`start-${option.value}`}
                    variant={startTime === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStartTime(option.value)}
                    className="h-10 text-sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">End Time</h3>
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {timeOptions.map((option) => (
                  <Button
                    key={`end-${option.value}`}
                    variant={endTime === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEndTime(option.value)}
                    className={`h-10 text-sm ${
                      startTime && isEndTimeOptionDisabled(startTime, option.value) 
                        ? 'opacity-30 cursor-not-allowed bg-gray-100' 
                        : ''
                    }`}
                    disabled={startTime && isEndTimeOptionDisabled(startTime, option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {startTime && endTime && !isEndTimeValid(startTime, endTime) && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">
                    ⚠️ End time must be different from start time. For overnight shifts, select a time earlier in the day (e.g., start at 8:30 AM, end at 12:00 AM next day).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Break Duration and Time Type */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Break Duration</h3>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-center gap-3">
                  {/* Hours Display */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-10 w-14 px-2 text-lg font-bold border-2 border-blue-200 rounded-lg flex items-center justify-center bg-white shadow-sm">
                      {formatBreakDuration(breakDuration).hours}
                    </div>
                    <span className="text-xs font-medium text-gray-600">hours</span>
                  </div>
                  
                  {/* Minutes Display */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-10 w-14 px-2 text-lg font-bold border-2 border-blue-200 rounded-lg flex items-center justify-center bg-white shadow-sm">
                      {formatBreakDuration(breakDuration).minutes.toString().padStart(2, '0')}
                    </div>
                    <span className="text-xs font-medium text-gray-600">minutes</span>
                  </div>
                  
                  {/* Up/Down Buttons */}
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleBreakChange(15)}
                      disabled={disabled}
                      className="h-7 w-8 text-sm font-bold hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleBreakChange(-15)}
                      disabled={disabled || breakDuration === 'none' || parseInt(breakDuration) <= 0}
                      className="h-7 w-8 text-sm font-bold hover:bg-blue-50 hover:border-blue-300 transition-colors"
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

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Time Type</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={!isOvertime ? "default" : "outline"}
                    size="lg"
                    onClick={() => setIsOvertime(false)}
                    className={`h-12 text-base font-medium transition-all ${
                      !isOvertime 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                        : 'bg-white hover:bg-blue-50 border-2 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    Regular
                  </Button>
                  <Button
                    variant={isOvertime ? "default" : "outline"}
                    size="lg"
                    onClick={() => setIsOvertime(true)}
                    className={`h-12 text-base font-medium transition-all ${
                      isOvertime 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                        : 'bg-white hover:bg-blue-50 border-2 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    Overtime
                  </Button>
                </div>
              </div>
              
              {/* Clear All Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="flex items-center gap-2 h-10 px-4 text-sm font-medium hover:bg-gray-100 hover:border-gray-400 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </div>
          </div>


          {/* Calculated Results */}
          {(startTime || endTime) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 text-xl mb-4">
                <Calculator className="h-6 w-6 text-blue-600" />
                <span className="font-bold text-blue-900">Calculated Hours</span>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                  <div className="text-sm font-medium text-gray-600 mb-2">Regular</div>
                  <div className="text-3xl font-bold text-blue-900">{formatHours(calculatedRegular)}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                  <div className="text-sm font-medium text-gray-600 mb-2">Overtime</div>
                  <div className="text-3xl font-bold text-blue-900">{formatHours(calculatedOvertime)}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                  <div className="text-sm font-medium text-gray-600 mb-2">Total</div>
                  <div className="text-3xl font-bold text-blue-900">{formatHours(calculatedTotal)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 h-11 px-6 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!startTime || !endTime}
              className="flex items-center gap-2 h-11 px-6 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calculator className="h-4 w-4" />
              Apply Hours
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
