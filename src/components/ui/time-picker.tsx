"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TimePickerProps {
  value: string // 12-hour format like "8:00 AM"
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  minTime?: string // 12-hour format - minimum allowed time
  maxTime?: string // 12-hour format - maximum allowed time
}

export function TimePicker({ value, onChange, disabled, className, placeholder = "Select time", minTime, maxTime }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [positionAbove, setPositionAbove] = React.useState(true)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const popupRef = React.useRef<HTMLDivElement>(null)

  // Parse current value
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: 8, minute: 0, period: 'AM' }
    
    try {
      const [time, period] = timeStr.split(' ')
      const [hour, minute] = time.split(':').map(Number)
      return {
        hour: hour || 8,
        minute: minute || 0,
        period: (period || 'AM').toUpperCase()
      }
    } catch {
      return { hour: 8, minute: 0, period: 'AM' }
    }
  }

  const { hour, minute, period } = parseTime(value)

  // Parse min/max times if provided
  const parseMinMax = (timeStr?: string) => {
    if (!timeStr) return null
    try {
      const [time, period] = timeStr.split(' ')
      const [hour, minute] = time.split(':').map(Number)
      return { hour: hour || 0, minute: minute || 0, period: (period || 'AM').toUpperCase() }
    } catch {
      return null
    }
  }

  const minTimeParsed = parseMinMax(minTime)
  const maxTimeParsed = parseMinMax(maxTime)

  // Convert 12-hour time to minutes since midnight for comparison
  const timeToMinutes = (h: number, m: number, p: string): number => {
    let hour24 = h
    if (p === 'PM' && h !== 12) {
      hour24 = h + 12
    } else if (p === 'AM' && h === 12) {
      hour24 = 0
    }
    return hour24 * 60 + m
  }

  // Check if a time combination is valid
  const isTimeValid = (h: number, m: number, p: string): boolean => {
    const timeMinutes = timeToMinutes(h, m, p)
    
    if (minTimeParsed) {
      const minMinutes = timeToMinutes(minTimeParsed.hour, minTimeParsed.minute, minTimeParsed.period)
      if (timeMinutes < minMinutes) return false
    }
    
    if (maxTimeParsed) {
      const maxMinutes = timeToMinutes(maxTimeParsed.hour, maxTimeParsed.minute, maxTimeParsed.period)
      if (timeMinutes > maxMinutes) return false
    }
    
    return true
  }

  // Check if a time combination would be valid when combined with other selected values
  const wouldBeValid = (newHour?: number, newMinute?: number, newPeriod?: string): boolean => {
    const finalHour = newHour !== undefined ? newHour : hour
    const finalMinute = newMinute !== undefined ? newMinute : minute
    const finalPeriod = newPeriod !== undefined ? newPeriod : period
    return isTimeValid(finalHour, finalMinute, finalPeriod)
  }

  // Generate options
  const hours = Array.from({ length: 12 }, (_, i) => i + 1) // 1-12
  const minutes = [0, 15, 30, 45] // 15-minute increments
  const periods = ['AM', 'PM']

  const handleChange = (newHour?: number, newMinute?: number, newPeriod?: string) => {
    const finalHour = newHour !== undefined ? newHour : hour
    const finalMinute = newMinute !== undefined ? newMinute : minute
    const finalPeriod = newPeriod !== undefined ? newPeriod : period
    
    // Validate the new time before applying
    if (!isTimeValid(finalHour, finalMinute, finalPeriod)) {
      // Don't allow invalid time selection at all - just return without calling onChange
      return
    }
    
    const time12 = `${finalHour}:${finalMinute.toString().padStart(2, '0')} ${finalPeriod}`
    onChange(time12)
  }

  const [popupPosition, setPopupPosition] = React.useState({ top: 0, left: 0 })

  // Calculate position - check if there's enough space above
  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const popupHeight = 450 // Approximate height of popup
      const popupWidth = 320
      const spaceAbove = containerRect.top
      const spaceBelow = window.innerHeight - containerRect.bottom
      
      // Check if there are form fields below that would be covered
      // Look for the dialog/modal content area
      const dialogContent = containerRef.current.closest('[role="dialog"]')?.querySelector('[class*="max-w"]')
      const parentContainer = containerRef.current.closest('[class*="space-y"]') || 
                              containerRef.current.parentElement
      
      let wouldOverlap = false
      if (dialogContent || parentContainer) {
        const containerRectToCheck = dialogContent ? dialogContent.getBoundingClientRect() : parentContainer.getBoundingClientRect()
        const popupBottomIfBelow = containerRect.bottom + popupHeight + 8
        // Check if popup would extend into form content below
        // Calculate how much space is available below the input field
        const availableSpaceBelow = containerRectToCheck.bottom - containerRect.bottom
        if (availableSpaceBelow < popupHeight + 50) { // 50px buffer
          wouldOverlap = true
        }
      }
      
      let top = 0
      let left = containerRect.left
      
      // Prefer showing above if:
      // 1. More space above
      // 2. In bottom half of screen
      // 3. Would overlap form fields below
      if (spaceAbove > spaceBelow || containerRect.top > window.innerHeight / 2 || wouldOverlap) {
        setPositionAbove(true)
        top = containerRect.top - popupHeight - 8 // 8px margin
      } else {
        setPositionAbove(false)
        top = containerRect.bottom + 8 // 8px margin
      }
      
      // Ensure popup doesn't go off screen horizontally
      if (left + popupWidth > window.innerWidth) {
        left = window.innerWidth - popupWidth - 16
      }
      if (left < 16) {
        left = 16
      }
      
      // Ensure popup doesn't go off screen vertically
      if (top < 16) {
        top = 16
        setPositionAbove(false)
      }
      if (top + popupHeight > window.innerHeight - 16) {
        top = window.innerHeight - popupHeight - 16
        setPositionAbove(true)
      }
      
      setPopupPosition({ top, left })
    }
  }, [isOpen])

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Don't close if clicking inside the time picker
      if (popupRef.current && popupRef.current.contains(target)) {
        return
      }
      
      // Don't close if clicking on the time picker input
      if (containerRef.current && containerRef.current.contains(target)) {
        return
      }
      
      // Don't close if clicking on a time picker element
      if (target.closest('[data-time-picker="true"]')) {
        return
      }
      
      // Close the time picker
        setIsOpen(false)
      }

    // Use capture phase with a delay to avoid conflicts with dialog
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true)
    }, 200)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2.5 border-2 rounded-lg cursor-pointer transition-all",
          "hover:border-blue-400 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50",
          isOpen && "border-blue-500 ring-2 ring-blue-200 bg-blue-50/50",
          !isOpen && "border-gray-300 bg-white"
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className={cn(
            "text-sm font-medium",
            value ? "text-gray-900" : "text-gray-400"
          )}>
            {value || placeholder}
          </span>
        </div>
        {value && !disabled && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            title="Clear"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>

      {isOpen && !disabled && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop to prevent clicks from reaching dialog */}
          <div
            className="fixed inset-0"
            style={{
              zIndex: 99998,
              pointerEvents: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
          {/* Time picker popup */}
          <div 
            ref={popupRef}
            className="fixed bg-white border-2 border-blue-300 rounded-lg shadow-2xl p-4 min-w-[320px]"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
              pointerEvents: 'auto',
              zIndex: 99999,
              isolation: 'isolate'
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (e.nativeEvent) {
                e.nativeEvent.stopImmediatePropagation()
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              if (e.nativeEvent) {
                e.nativeEvent.stopImmediatePropagation()
              }
            }}
            role="dialog"
            aria-modal="true"
            data-time-picker="true"
          >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Select Time
            </h3>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(false)
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(false)
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              type="button"
              aria-label="Close time picker"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
      </div>

          {/* Current Selection Display */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="text-xs text-gray-600 mb-1">Selected Time</div>
            <div className="text-2xl font-bold text-blue-700">
              {hour}:{minute.toString().padStart(2, '0')} {period}
            </div>
              </div>

          <div className="space-y-4">
            {/* Hours Grid */}
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2 px-1">Hour</div>
              <div className="grid grid-cols-4 gap-2">
                {hours.map((h) => {
                  // Check if this hour would be valid with current minute and period
                  // Also check if it has ANY valid combination
                  const isValidWithCurrent = isTimeValid(h, minute, period)
                  const hasValidCombination = minutes.some(m => 
                    periods.some(p => isTimeValid(h, m, p))
                  )
                  const isDisabled = !hasValidCombination
                  
                  return (
                    <Button
                      key={h}
                      type="button"
                      variant={hour === h ? "default" : "outline"}
                      size="sm"
                      disabled={isDisabled}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isDisabled && isValidWithCurrent) {
                          handleChange(h, undefined, undefined)
                        } else if (!isDisabled) {
                          // If hour is valid but not with current minute/period, find first valid combination
                          for (const m of minutes) {
                            for (const p of periods) {
                              if (isTimeValid(h, m, p)) {
                                handleChange(h, m, p)
                                return
                              }
                            }
                          }
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isDisabled && isValidWithCurrent) {
                          handleChange(h, undefined, undefined)
                        } else if (!isDisabled) {
                          // If hour is valid but not with current minute/period, find first valid combination
                          for (const m of minutes) {
                            for (const p of periods) {
                              if (isTimeValid(h, m, p)) {
                                handleChange(h, m, p)
                                return
                              }
                            }
                          }
                        }
                      }}
                      className={cn(
                        "h-10 font-semibold transition-all",
                        hour === h 
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                          : "hover:bg-blue-50 hover:border-blue-300",
                        isDisabled && "opacity-40 cursor-not-allowed bg-gray-100 border-gray-200 hover:bg-gray-100 hover:border-gray-200"
                      )}
                    >
                      {h}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Minutes Grid */}
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2 px-1">Minutes</div>
              <div className="grid grid-cols-4 gap-2">
                {minutes.map((m) => {
                  // Check if this minute is valid with current hour and period
                  const isValid = isTimeValid(hour, m, period)
                  const isDisabled = !isValid
                  
                  return (
                    <Button
                      key={m}
                      type="button"
                      variant={minute === m ? "default" : "outline"}
                      size="sm"
                      disabled={isDisabled}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isDisabled) {
                          handleChange(undefined, m, undefined)
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isDisabled) {
                          handleChange(undefined, m, undefined)
                        }
                      }}
                      className={cn(
                        "h-10 font-semibold transition-all",
                        minute === m 
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                          : "hover:bg-blue-50 hover:border-blue-300",
                        isDisabled && "opacity-40 cursor-not-allowed bg-gray-100 border-gray-200 hover:bg-gray-100 hover:border-gray-200"
                      )}
                    >
                      {m.toString().padStart(2, '0')}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* AM/PM Buttons */}
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2 px-1">Period</div>
              <div className="grid grid-cols-2 gap-2">
                {periods.map((p) => {
                  // Check if this period is valid with current hour and minute
                  const isValid = isTimeValid(hour, minute, p)
                  const isDisabled = !isValid
                  
                  return (
                    <Button
                      key={p}
                      type="button"
                      variant={period === p ? "default" : "outline"}
                      size="lg"
                      disabled={isDisabled}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isDisabled) {
                          handleChange(undefined, undefined, p)
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isDisabled) {
                          handleChange(undefined, undefined, p)
                        }
                      }}
                      className={cn(
                        "h-12 font-bold text-base transition-all",
                        period === p 
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                          : "hover:bg-blue-50 hover:border-blue-300",
                        isDisabled && "opacity-40 cursor-not-allowed bg-gray-100 border-gray-200 hover:bg-gray-100 hover:border-gray-200"
                      )}
                    >
                      {p}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-4 pt-3 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(false)
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(false)
              }}
              className="text-sm"
            >
              Done
            </Button>
          </div>
        </div>
        </>
      , document.body)}
    </div>
  )
}

