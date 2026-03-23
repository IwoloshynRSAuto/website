'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, User, FileText, Loader2, X, Plus, LogIn, LogOut, Calendar, Trash2 } from 'lucide-react'
import { TimePicker } from '@/components/ui/time-picker'
import { SimpleDatePicker } from '@/components/ui/simple-date-picker'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useToast } from '@/components/ui/use-toast'
import { format, startOfDay } from 'date-fns'
import { roundTimeString, formatTime12Hour, convert12To24Hour, calculateHoursBetween } from '@/lib/utils/time-rounding'
import { roundToNearest15Minutes } from '@/lib/utils/time-rounding'
import { patchClockInGeolocation } from '@/lib/utils/geolocation'

interface User {
  id: string
  name: string | null
  email: string | null
}

interface Job {
  id: string
  jobNumber: string
  title: string
}

interface LaborCode {
  id: string
  code: string
  name: string
}

interface TimesheetEntry {
  id: string
  userId: string
  date: string
  clockInTime: string
  clockOutTime: string | null
  totalHours: number | null
  status: string
  jobEntries: JobEntry[]
}

interface JobEntry {
  id: string
  jobNumber: string
  laborCode: string
  punchInTime: string
  punchOutTime: string | null
  notes: string | null
}

interface TimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  selectedEntry: TimesheetEntry | null
  userId: string
  userName: string
  users: User[]
  jobs: Job[]
  laborCodes: LaborCode[]
  isAdmin: boolean
  mode: 'clock' | 'job' // Locked mode - no tab switching
}

export function TimeEntryModal({
  isOpen,
  onClose,
  selectedDate,
  selectedEntry,
  userId,
  userName,
  users,
  jobs,
  laborCodes,
  isAdmin,
  mode
}: TimeEntryModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false)
  const [changeRequestClockIn, setChangeRequestClockIn] = useState('')
  const [changeRequestClockOut, setChangeRequestClockOut] = useState('')
  const [changeRequestNote, setChangeRequestNote] = useState('')
  // Modal maintains local state for editable fields but must initialize from selectedDate
  // Always normalize to startOfDay to avoid timezone issues
  const [entryDate, setEntryDate] = useState<Date>(() => startOfDay(selectedDate ?? new Date()))

  // Geolocation enabled - read from localStorage (managed in geolocation settings page)
  const [geolocationEnabledState, setGeolocationEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('attendance-geolocation-enabled')
      return saved !== 'false' // Default to enabled if not set
    }
    return true
  })

  // Listen for changes to geolocation setting from other tabs/components
  useEffect(() => {
    const checkGeolocationSetting = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('attendance-geolocation-enabled')
        const enabled = saved !== 'false'
        setGeolocationEnabledState(enabled)
      }
    }
    checkGeolocationSetting()
    window.addEventListener('storage', checkGeolocationSetting)
    window.addEventListener('geolocation-setting-changed', checkGeolocationSetting)
    
    // Also check periodically in case localStorage was changed in same tab
    const interval = setInterval(checkGeolocationSetting, 1000)
    
    return () => {
      window.removeEventListener('storage', checkGeolocationSetting)
      window.removeEventListener('geolocation-setting-changed', checkGeolocationSetting)
      clearInterval(interval)
    }
  }, [])

  // Clock In/Out fields
  const [selectedUserId, setSelectedUserId] = useState(userId)
  const [clockInTime, setClockInTime] = useState('')
  const [clockOutTime, setClockOutTime] = useState('')
  const [hasActiveClockIn, setHasActiveClockIn] = useState(false)
  const [activeTimesheetId, setActiveTimesheetId] = useState<string | null>(null)

  // Job Entry fields - declare BEFORE useEffect that uses them
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedLaborCodeId, setSelectedLaborCodeId] = useState('')
  const [jobStartTime, setJobStartTime] = useState('')
  const [jobEndTime, setJobEndTime] = useState('')
  const [notes, setNotes] = useState('')

  // Wrapper for setClockOutTime that validates against clockInTime
  const handleClockOutTimeChange = (newTime: string) => {
    if (!newTime) {
      setClockOutTime('')
      return
    }
    
    if (clockInTime) {
      const clockIn24 = convert12To24Hour(clockInTime)
      const clockOut24 = convert12To24Hour(newTime)
      const [inHours, inMinutes] = clockIn24.split(':').map(Number)
      const [outHours, outMinutes] = clockOut24.split(':').map(Number)
      
      const inMinutesTotal = inHours * 60 + inMinutes
      const outMinutesTotal = outHours * 60 + outMinutes
      
      // Only set if clock out is after clock in
      if (outMinutesTotal > inMinutesTotal) {
        setClockOutTime(newTime)
      } else {
        toast({
          title: 'Invalid Time',
          description: 'Clock out time must be after clock in time',
          variant: 'destructive'
        })
      }
    } else {
      setClockOutTime(newTime)
    }
  }

  // Validate clock out time when clock in time changes
  useEffect(() => {
    if (clockInTime && clockOutTime) {
      const clockIn24 = convert12To24Hour(clockInTime)
      const clockOut24 = convert12To24Hour(clockOutTime)
      const [inHours, inMinutes] = clockIn24.split(':').map(Number)
      const [outHours, outMinutes] = clockOut24.split(':').map(Number)
      
      const inMinutesTotal = inHours * 60 + inMinutes
      const outMinutesTotal = outHours * 60 + outMinutes
      
      // If clock out is before or equal to clock in, clear it
      if (outMinutesTotal <= inMinutesTotal) {
        setClockOutTime('')
      }
    }
  }, [clockInTime, clockOutTime])

  // Validate job end time when job start time changes - rewritten to avoid initialization issues
  useEffect(() => {
    // Only run if both times are set and valid
    if (!jobStartTime || !jobEndTime) {
      return
    }
    
    try {
      const start24 = convert12To24Hour(jobStartTime)
      const end24 = convert12To24Hour(jobEndTime)
      
      if (!start24 || !end24) {
        return
      }
      
      const startParts = start24.split(':')
      const endParts = end24.split(':')
      
      if (startParts.length !== 2 || endParts.length !== 2) {
        return
      }
      
      const startHours = parseInt(startParts[0], 10)
      const startMinutes = parseInt(startParts[1], 10)
      const endHours = parseInt(endParts[0], 10)
      const endMinutes = parseInt(endParts[1], 10)
      
      // Validate parsed values
      if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
        return
      }
      
      const startMinutesTotal = (startHours * 60) + startMinutes
      const endMinutesTotal = (endHours * 60) + endMinutes
      
      // Ensure values are valid before comparison
      if (startMinutesTotal >= 0 && endMinutesTotal >= 0) {
        // If end is before or equal to start, clear it
        if (endMinutesTotal <= startMinutesTotal) {
          setJobEndTime('')
        }
      }
    } catch (error) {
      console.error('Error validating job times:', error)
      // Don't clear on error, just log it
    }
  }, [jobStartTime, jobEndTime])

  // Wrapper for setJobEndTime that validates against jobStartTime - rewritten to avoid initialization issues
  const handleJobEndTimeChange = (newTime: string) => {
    if (!newTime) {
      setJobEndTime('')
      return
    }
    
    if (!jobStartTime) {
      setJobEndTime(newTime)
      return
    }
    
    try {
      const start24 = convert12To24Hour(jobStartTime)
      const end24 = convert12To24Hour(newTime)
      
      if (!start24 || !end24) {
        setJobEndTime(newTime)
        return
      }
      
      const startParts = start24.split(':')
      const endParts = end24.split(':')
      
      if (startParts.length !== 2 || endParts.length !== 2) {
        setJobEndTime(newTime)
        return
      }
      
      const startHours = parseInt(startParts[0], 10)
      const startMinutes = parseInt(startParts[1], 10)
      const endHours = parseInt(endParts[0], 10)
      const endMinutes = parseInt(endParts[1], 10)
      
      // Validate parsed values
      if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
        setJobEndTime(newTime)
        return
      }
      
      const startMinutesTotal = (startHours * 60) + startMinutes
      const endMinutesTotal = (endHours * 60) + endMinutes
      
      // Ensure values are valid before comparison
      if (startMinutesTotal >= 0 && endMinutesTotal >= 0) {
        // Only set if end is after start
        if (endMinutesTotal > startMinutesTotal) {
          setJobEndTime(newTime)
        } else {
          toast({
            title: 'Invalid Time',
            description: 'End time must be after start time',
            variant: 'destructive'
          })
        }
      } else {
        // If values are invalid, just set the time
        setJobEndTime(newTime)
      }
    } catch (error) {
      console.error('Error validating job end time:', error)
      // On error, just set the time
      setJobEndTime(newTime)
    }
  }

  // Ensure entryDate updates when selectedDate prop changes (keeps modal in sync)
  // This is critical for new entries to always show the correct date
  useEffect(() => {
    if (!selectedEntry && selectedDate) {
      // Only update for new entries, not when editing
      const newDate = startOfDay(new Date(selectedDate))
      setEntryDate(newDate)
    }
  }, [selectedDate, selectedEntry])

  // Check for active clock-in function - use useCallback to avoid dependency issues
  const checkActiveClockIn = useCallback(async () => {
    if (!selectedUserId) return
    
    try {
      const today = startOfDay(new Date())
      const response = await fetch(`/api/timesheets?userId=${selectedUserId}&startDate=${today.toISOString()}&endDate=${today.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        // Ensure we have an array - handle both array and object responses
        const timesheets = Array.isArray(data) ? data : (data.data || data.timesheets || [])
        // Find active timesheet (clocked in but not clocked out)
        const activeTimesheet = Array.isArray(timesheets) ? timesheets.find((ts: any) => 
          ts.clockInTime && !ts.clockOutTime && ts.status === 'in-progress'
        ) : null
        
        if (activeTimesheet) {
          setHasActiveClockIn(true)
          setActiveTimesheetId(activeTimesheet.id)
          // If editing the active timesheet, populate clock in time
          if (selectedEntry?.id === activeTimesheet.id) {
            const clockIn12 = formatTime12Hour(new Date(activeTimesheet.clockInTime))
            setClockInTime(clockIn12)
          }
        } else {
          setHasActiveClockIn(false)
          setActiveTimesheetId(null)
        }
      }
    } catch (error) {
      console.error('Error checking active clock-in:', error)
    }
  }, [selectedUserId, selectedEntry])

  // Check for active clock-in when modal opens or user changes
  useEffect(() => {
    if (mode === 'clock' && isOpen && selectedUserId) {
      checkActiveClockIn()
    }
  }, [mode, isOpen, selectedUserId, checkActiveClockIn])

  useEffect(() => {
    if (selectedEntry) {
      // Editing existing entry
      setSelectedUserId(selectedEntry.userId)
      setEntryDate(new Date(selectedEntry.date))
      setClockInTime(formatTime12Hour(new Date(selectedEntry.clockInTime)))
      if (selectedEntry.clockOutTime) {
        setClockOutTime(formatTime12Hour(new Date(selectedEntry.clockOutTime)))
      }
      if (selectedEntry.jobEntries.length > 0) {
        const firstJob = selectedEntry.jobEntries[0]
        const job = Array.isArray(jobs) ? jobs.find(j => j.jobNumber === firstJob.jobNumber) : null
        const laborCode = Array.isArray(laborCodes) ? laborCodes.find(lc => lc.code === firstJob.laborCode) : null
        if (job) setSelectedJobId(job.id)
        if (laborCode) setSelectedLaborCodeId(laborCode.id)
        setJobStartTime(formatTime12Hour(new Date(firstJob.punchInTime)))
        if (firstJob.punchOutTime) {
          setJobEndTime(formatTime12Hour(new Date(firstJob.punchOutTime)))
        }
        if (firstJob.notes) setNotes(firstJob.notes)
        // Mode is locked, no need to switch tabs
      }
    } else {
      // New entry - reset fields
      setSelectedUserId(userId)
      // Use selectedDate, defaulting to today if undefined
      const newEntryDate = selectedDate ? startOfDay(new Date(selectedDate)) : startOfDay(new Date())
      setEntryDate(newEntryDate)
      setClockInTime('')
      setClockOutTime('')
      setSelectedJobId('')
      setSelectedLaborCodeId('')
      setJobStartTime('')
      setJobEndTime('')
      setNotes('')
      // Mode is locked, no need to switch tabs
    }
  }, [selectedEntry, userId, jobs, laborCodes, selectedDate, mode])

  const getCurrentLocation = (): Promise<{ lat: number; lon: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      const positions: GeolocationPosition[] = []
      let watchId: number | null = null
      const minReadings = 15 // More readings for better accuracy
      const maxReadings = 25 // Collect more samples for averaging
      const minAccuracy = 5 // Target accuracy in meters (5m is good for most use cases)
      const maxWaitTime = 60000 // Maximum 60 seconds total for better GPS fix
      const stabilizationTime = 4000 // Wait 4 seconds after last reading to ensure stability

      const options = {
        enableHighAccuracy: true,  // Use GPS for better accuracy
        timeout: 60000,            // Increased timeout for GPS fix (60 seconds)
        maximumAge: 0,             // Force fresh reading, don't use cache
      }
      
      console.log('[getCurrentLocation] Starting high-accuracy geolocation capture...')
      console.log('[getCurrentLocation] Settings:', { minReadings, maxReadings, minAccuracy, maxWaitTime, stabilizationTime })

      let lastReadingTime = 0
      let stabilizationTimer: NodeJS.Timeout | null = null

      // Helper function to calculate weighted average
      const calculateWeightedAverage = (positions: GeolocationPosition[]) => {
        if (positions.length === 0) return null

        // Filter out outliers - remove positions that are too far from the median
        const lats = positions.map(p => p.coords.latitude).sort((a, b) => a - b)
        const lons = positions.map(p => p.coords.longitude).sort((a, b) => a - b)
        const medianLat = lats[Math.floor(lats.length / 2)]
        const medianLon = lons[Math.floor(lons.length / 2)]

        // Calculate distance from median for each position
        const filtered = positions.filter(pos => {
          const latDiff = Math.abs(pos.coords.latitude - medianLat) * 111000 // Convert to meters
          const lonDiff = Math.abs(pos.coords.longitude - medianLon) * 111000 * Math.cos(medianLat * Math.PI / 180)
          const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff)
          return distance < 20 // Filter out readings more than 20m from median (tighter filter for accuracy)
        })

        if (filtered.length === 0) {
          // If all filtered out, use original positions
          filtered.push(...positions)
        }

        // Calculate weighted average (inverse of accuracy = weight)
        let totalWeight = 0
        let weightedLat = 0
        let weightedLon = 0
        let minAccuracy = Infinity

        filtered.forEach(pos => {
          const accuracy = pos.coords.accuracy || 100 // Default to 100m if no accuracy
          const weight = 1 / (accuracy * accuracy) // Square inverse for better weighting
          totalWeight += weight
          weightedLat += pos.coords.latitude * weight
          weightedLon += pos.coords.longitude * weight
          if (accuracy < minAccuracy) {
            minAccuracy = accuracy
          }
        })

        return {
          lat: weightedLat / totalWeight,
          lon: weightedLon / totalWeight,
          accuracy: minAccuracy
        }
      }

      // Use watchPosition to get multiple readings
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          positions.push(position)
          lastReadingTime = Date.now()
          const accuracy = position.coords.accuracy || 0
          console.log(`[getCurrentLocation] Reading ${positions.length}: accuracy=${accuracy.toFixed(1)}m, lat=${position.coords.latitude.toFixed(6)}, lon=${position.coords.longitude.toFixed(6)}`)

          // Clear existing stabilization timer
          if (stabilizationTimer) {
            clearTimeout(stabilizationTimer)
          }

          // Check if we have enough readings and good accuracy
          const currentBest = positions.reduce((best, pos) => 
            (!best || (pos.coords.accuracy || Infinity) < (best.coords.accuracy || Infinity)) ? pos : best,
            null as GeolocationPosition | null
          )

          if (currentBest && currentBest.coords.accuracy < minAccuracy && positions.length >= minReadings) {
            // We have a very accurate reading and enough samples
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId)
            }
            const result = calculateWeightedAverage(positions)
            if (result) {
              console.log(`[getCurrentLocation] ✅ High accuracy achieved: ${result.accuracy.toFixed(1)}m after ${positions.length} readings`)
              resolve(result)
            } else {
              console.log(`[getCurrentLocation] ✅ Using best reading: ${currentBest.coords.accuracy?.toFixed(1)}m after ${positions.length} readings`)
              resolve({
                lat: currentBest.coords.latitude,
                lon: currentBest.coords.longitude,
                accuracy: currentBest.coords.accuracy || 0,
              })
            }
            return
          }

          // If we have enough readings, wait for stabilization
          if (positions.length >= minReadings) {
            stabilizationTimer = setTimeout(() => {
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId)
              }
              const result = calculateWeightedAverage(positions)
              if (result) {
                resolve(result)
              } else if (positions.length > 0) {
                const best = positions.reduce((best, pos) => 
                  (!best || (pos.coords.accuracy || Infinity) < (best.coords.accuracy || Infinity)) ? pos : best,
                  null as GeolocationPosition | null
                )
                if (best) {
                  resolve({
                    lat: best.coords.latitude,
                    lon: best.coords.longitude,
                    accuracy: best.coords.accuracy || 0,
                  })
                }
              }
            }, stabilizationTime)
          }

          // Stop if we have too many readings
          if (positions.length >= maxReadings) {
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId)
            }
            if (stabilizationTimer) {
              clearTimeout(stabilizationTimer)
            }
            const result = calculateWeightedAverage(positions)
            if (result) {
              resolve(result)
            } else if (positions.length > 0) {
              const best = positions.reduce((best, pos) => 
                (!best || (pos.coords.accuracy || Infinity) < (best.coords.accuracy || Infinity)) ? pos : best,
                null as GeolocationPosition | null
              )
              if (best) {
                resolve({
                  lat: best.coords.latitude,
                  lon: best.coords.longitude,
                  accuracy: best.coords.accuracy || 0,
                })
              }
            }
          }
        },
        (error) => {
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId)
          }
          if (stabilizationTimer) {
            clearTimeout(stabilizationTimer)
          }
          // If we got at least one reading, use weighted average
          if (positions.length > 0) {
            const result = calculateWeightedAverage(positions)
            if (result) {
              resolve(result)
            } else {
              const best = positions.reduce((best, pos) => 
                (!best || (pos.coords.accuracy || Infinity) < (best.coords.accuracy || Infinity)) ? pos : best,
                null as GeolocationPosition | null
              )
              if (best) {
                resolve({
                  lat: best.coords.latitude,
                  lon: best.coords.longitude,
                  accuracy: best.coords.accuracy || 0,
                })
              } else {
                resolve(null)
              }
            }
          } else {
            // Fallback to getCurrentPosition if watchPosition fails
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  lat: position.coords.latitude,
                  lon: position.coords.longitude,
                  accuracy: position.coords.accuracy || 0,
                })
              },
              () => {
                resolve(null)
              },
              options
            )
          }
        },
        options
      )

      // Fallback timeout - if we don't get a good reading in time, use weighted average
      setTimeout(() => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId)
        }
        if (stabilizationTimer) {
          clearTimeout(stabilizationTimer)
        }
        if (positions.length > 0) {
          const result = calculateWeightedAverage(positions)
          if (result) {
            resolve(result)
          } else {
            const best = positions.reduce((best, pos) => 
              (!best || (pos.coords.accuracy || Infinity) < (best.coords.accuracy || Infinity)) ? pos : best,
              null as GeolocationPosition | null
            )
            if (best) {
              resolve({
                lat: best.coords.latitude,
                lon: best.coords.longitude,
                accuracy: best.coords.accuracy || 0,
              })
            } else {
              resolve(null)
            }
          }
        } else {
          // Final fallback
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy || 0,
              })
            },
            () => {
              resolve(null)
            },
            options
          )
        }
      }, maxWaitTime)
    })
  }

  const handleSaveClockInOut = async () => {
    console.log('[Time Entry Modal] ========== handleSaveClockInOut CALLED ==========')
    console.log('[Time Entry Modal] hasActiveClockIn:', hasActiveClockIn)
    console.log('[Time Entry Modal] clockInTime:', clockInTime)
    console.log('[Time Entry Modal] clockOutTime:', clockOutTime)
    console.log('[Time Entry Modal] selectedEntry:', selectedEntry)
    
    // Check if entry is locked
    if (selectedEntry && (selectedEntry as any).isLocked) {
      toast({
        title: 'Entry Locked',
        description: 'This entry has been submitted for approval and cannot be edited.',
        variant: 'default'
      })
      return
    }

    // Determine if this is a clock in or clock out action
    const isClockIn = !hasActiveClockIn && clockInTime && !clockOutTime
    const isClockOut = (hasActiveClockIn || clockInTime) && clockOutTime
    
    console.log('[Time Entry Modal] isClockIn:', isClockIn)
    console.log('[Time Entry Modal] isClockOut:', isClockOut)
    console.log('[Time Entry Modal] Will enter clock-in branch?', isClockIn && !isClockOut)

    // If clocking in, check that user is not already clocked in
    if (isClockIn && hasActiveClockIn && !selectedEntry) {
      toast({
        title: 'Error',
        description: 'You are already clocked in. Please clock out first.',
        variant: 'destructive'
      })
      return
    }

    // If clocking out, check that user is clocked in
    if (isClockOut && !hasActiveClockIn && !clockInTime && !selectedEntry) {
      toast({
        title: 'Error',
        description: 'You must clock in first before clocking out.',
        variant: 'destructive'
      })
      return
    }

    // For clock in, clockInTime is required
    if (isClockIn && !clockInTime) {
      toast({
        title: 'Error',
        description: 'Please clock in to record the current time',
        variant: 'destructive'
      })
      return
    }

    // For clock out, we need either an active timesheet or clock in time
    if (isClockOut && !clockOutTime) {
      toast({
        title: 'Error',
        description: 'Please clock out to record the current time',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      // For clock out, we may not have clockInTime set if using active timesheet
      let clockInDate: Date
      if (isClockOut && hasActiveClockIn && activeTimesheetId) {
        // Get clock in time from active timesheet
        const response = await fetch(`/api/timesheets/${activeTimesheetId}`)
        if (response.ok) {
          const timesheet = await response.json()
          clockInDate = new Date(timesheet.clockInTime)
        } else {
          throw new Error('Failed to fetch active timesheet')
        }
      } else {
        // Use clock in time from form
        const clockIn24 = convert12To24Hour(clockInTime)
        const roundedClockIn = roundTimeString(clockIn24)
        const [hours, minutes] = roundedClockIn.split(':').map(Number)
        const year = entryDate.getFullYear()
        const month = entryDate.getMonth()
        const day = entryDate.getDate()
        clockInDate = new Date(year, month, day, hours, minutes, 0, 0)
      }

      let clockOutDate: Date | null = null
      if (clockOutTime) {
        const clockOut24 = convert12To24Hour(clockOutTime)
        const roundedClockOut = roundTimeString(clockOut24)
        const [outHours, outMinutes] = roundedClockOut.split(':').map(Number)
        const year = entryDate.getFullYear()
        const month = entryDate.getMonth()
        const day = entryDate.getDate()
        clockOutDate = new Date(year, month, day, outHours, outMinutes, 0, 0)
        
        // Validate that clock out is after clock in
        if (clockOutDate <= clockInDate) {
          toast({
            title: 'Error',
            description: 'Clock out time must be after clock in time',
            variant: 'destructive'
          })
          setIsSubmitting(false)
          return
        }
      }

      const year = entryDate.getFullYear()
      const month = entryDate.getMonth()
      const day = entryDate.getDate()

      // Check for overlapping entries on the same date (only for clock in, not clock out)
      // Note: We skip client-side overlap check and let the server handle it
      // The server properly filters out job-only timesheets

      // If clocking out an active timesheet, use the active timesheet ID
      const timesheetIdToUpdate = activeTimesheetId || selectedEntry?.id

      console.log('[Time Entry Modal] Branch decision:', {
        timesheetIdToUpdate,
        isClockOut,
        isClockIn,
        hasSelectedEntry: !!selectedEntry,
        willEnterClockOutBranch: !!(timesheetIdToUpdate && (isClockOut || (selectedEntry && !isClockIn))),
        willEnterClockInBranch: isClockIn
      })

      if (timesheetIdToUpdate && (isClockOut || (selectedEntry && !isClockIn))) {
        // Update existing timesheet (clocking out or editing)
        console.log('[Time Entry Modal] ✅ Entering CLOCK-OUT/EDIT branch')
        const updateData: any = {}
        if (isClockOut) {
          // Send clock-out immediately, geolocation will be updated in background
          updateData.clockOutTime = clockOutDate?.toISOString() || null
          updateData.status = clockOutDate ? 'completed' : 'in-progress'
          updateData.clockOutGeoLat = null // Will be updated in background
          updateData.clockOutGeoLon = null
          updateData.clockOutGeoAccuracy = null
        } else if (selectedEntry) {
          // Editing existing entry with both times
          updateData.clockInTime = clockInDate.toISOString()
          updateData.clockOutTime = clockOutDate?.toISOString() || null
          updateData.status = clockOutDate ? 'completed' : 'in-progress'
          // Geolocation will be updated in background if clocking out
        }

        const response = await fetch(`/api/timesheets/${timesheetIdToUpdate}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })

        // Update geolocation for clock-out (synchronous, like clock-in) - only if enabled
        if (response.ok && (isClockOut || (selectedEntry && clockOutDate))) {
          const geoEnabledFromStorage = typeof window !== 'undefined' 
            ? localStorage.getItem('attendance-geolocation-enabled') !== 'false'
            : true
          const localStorageValue = typeof window !== 'undefined' 
            ? localStorage.getItem('attendance-geolocation-enabled')
            : null
          
          console.log('[Clock Out] ========== GEOLOCATION CHECK ==========')
          console.log('[Clock Out] Timesheet ID:', timesheetIdToUpdate)
          console.log('[Clock Out] Geolocation enabled state:', geolocationEnabledState)
          console.log('[Clock Out] Geo enabled from storage:', geoEnabledFromStorage)
          console.log('[Clock Out] LocalStorage value:', localStorageValue)
          console.log('[Clock Out] Navigator.geolocation available:', typeof navigator !== 'undefined' && !!navigator.geolocation)
          
          const shouldAttemptGeolocation = timesheetIdToUpdate && (
            geolocationEnabledState || 
            geoEnabledFromStorage || 
            (localStorageValue === null) // If not set, default to enabled
          )
          
          console.log('[Clock Out] Should attempt geolocation:', shouldAttemptGeolocation)
          console.log('[Clock Out] ========================================')
          
          if (shouldAttemptGeolocation && timesheetIdToUpdate) {
            console.log('[Clock Out] 🎯 ATTEMPTING TO GET GEOLOCATION NOW...')
            try {
              // Give it up to 45 seconds to try all attempts
              const locationPromise = getCurrentLocation()
            const timeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => {
                console.log('[Clock Out] ⏱️ Geolocation timeout after 60 seconds - giving up')
                resolve(null)
              }, 60000)
            })
              
              const locationData = await Promise.race([locationPromise, timeoutPromise])
              
              if (locationData) {
                console.log('[Clock Out] ✅ Location obtained:', locationData)
                console.log('[Clock Out] Saving geolocation to timesheet:', timesheetIdToUpdate)
                
                const geoResponse = await fetch(`/api/timesheets/${timesheetIdToUpdate}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    clockOutGeoLat: locationData.lat,
                    clockOutGeoLon: locationData.lon,
                    clockOutGeoAccuracy: locationData.accuracy,
                  })
                })
                
                if (geoResponse.ok) {
                  const geoResponseData = await geoResponse.json()
                  console.log('[Clock Out] ✅✅✅ GEOLOCATION SAVED SUCCESSFULLY!', geoResponseData)
                } else {
                  const errorText = await geoResponse.text()
                  console.error('[Clock Out] ❌ Failed to save geolocation:', geoResponse.status, errorText)
                }
              } else {
                console.log('[Clock Out] ⚠️ Geolocation returned null')
              }
            } catch (geoError) {
              console.error('[Clock Out] ❌ Error getting/saving geolocation:', geoError)
            }
          } else {
            console.log('[Clock Out] ⏭️ Skipping geolocation (disabled or no timesheet ID)')
          }
        }

        if (!response.ok) {
          let errorMessage = 'Failed to update timesheet'
          let errorDetails = ''
          try {
            const error = await response.json()
            errorMessage = error.error || error.message || errorMessage
            errorDetails = error.details ? ` ${error.details}` : ''
          } catch (parseError) {
            errorMessage = `Request failed: ${response.status} ${response.statusText}`
          }
          const fullErrorMessage = `${errorMessage}${errorDetails}`
          const isOverlapError = fullErrorMessage.toLowerCase().includes('overlap') || 
                                fullErrorMessage.toLowerCase().includes('overlapping')
          
          console.error('[Time Entry Modal] Error updating timesheet:', {
            status: response.status,
            errorMessage,
            errorDetails,
            isOverlapError,
            fullErrorMessage
          })
          
          toast({
            title: isOverlapError ? '⛔ Time Overlap Detected' : 'Error',
            description: fullErrorMessage,
            variant: 'destructive',
            duration: isOverlapError ? 10000 : 5000 // Show overlap errors longer
          })
          setIsSubmitting(false)
          return
        }
      } else if (isClockIn) {
        // USE EXACT SAME PATTERN AS CLOCK-OUT (which works):
        // 1. Create timesheet WITHOUT geolocation first
        // 2. Then PATCH with geolocation (same as clock-out does)
        console.log('[Clock In] ========== STARTING CLOCK IN (SAME PATTERN AS CLOCK-OUT) ==========')
        console.log('[Clock In] ✅ ENTERED CLOCK-IN BRANCH!')
        console.log('[Clock In] Condition check:', {
          isClockIn,
          hasActiveClockIn,
          clockInTime,
          clockOutTime,
          selectedEntry: !!selectedEntry
        })
        
        // STEP 1: Create timesheet FIRST (without geolocation, like clock-out does)
        console.log('[Clock In] 🎯 STEP 1: CREATING TIMESHEET (without geolocation)...')
        
        const requestBody: any = {
          clockInTime: clockInDate.toISOString(),
          date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }
        
        // If admin selected a different user, include userId
        if (isAdmin && selectedUserId && selectedUserId !== userId) {
          requestBody.userId = selectedUserId
        }
        
        // NEVER include geolocation in POST - must use PATCH after creation
        
        console.log('[Clock In] POST request body:', JSON.stringify(requestBody, null, 2))
        
        const response = await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('[Clock In] ❌ STEP 2 ERROR: Failed to create timesheet:', errorData)
          throw new Error(errorData.error || 'Failed to clock in')
        }
        
        const responseData = await response.json()
        console.log('[Clock In] ✅ STEP 1 SUCCESS: Timesheet created')
        console.log('[Clock In] Response data:', responseData)
        
        // Extract timesheet ID - MUST use response.data?.id ?? response.id
        const timesheetId = responseData.data?.id ?? responseData.id
        console.log('[Clock In] Extracted timesheet ID:', timesheetId)
        
        if (!timesheetId) {
          console.error('[Clock In] ❌❌❌ CRITICAL: No timesheet ID found!')
          console.error('[Clock In] Response structure:', JSON.stringify(responseData, null, 2))
          throw new Error('Failed to get timesheet ID from response')
        }
        
        // STEP 2: PATCH with geolocation - EXACT SAME PATTERN AS CLOCK-OUT
        // Check geolocation setting (same as clock-out does)
        const geoEnabledFromStorage = typeof window !== 'undefined' 
          ? localStorage.getItem('attendance-geolocation-enabled') !== 'false'
          : true
        const localStorageValue = typeof window !== 'undefined' 
          ? localStorage.getItem('attendance-geolocation-enabled')
          : null
        
        console.log('[Clock In] ========== GEOLOCATION CHECK ==========')
        console.log('[Clock In] Timesheet ID:', timesheetId)
        console.log('[Clock In] Geolocation enabled state:', geolocationEnabledState)
        console.log('[Clock In] Geo enabled from storage:', geoEnabledFromStorage)
        console.log('[Clock In] LocalStorage value:', localStorageValue)
        console.log('[Clock In] Navigator.geolocation available:', typeof navigator !== 'undefined' && !!navigator.geolocation)
        
        const shouldAttemptGeolocation = timesheetId && (
          geolocationEnabledState || 
          geoEnabledFromStorage || 
          (localStorageValue === null) // If not set, default to enabled
        )
        
        console.log('[Clock In] Should attempt geolocation:', shouldAttemptGeolocation)
        console.log('[Clock In] ========================================')
        
        if (shouldAttemptGeolocation && timesheetId) {
          console.log('[Clock In] 🎯 ATTEMPTING TO GET GEOLOCATION NOW...')
          try {
            const locationPromise = getCurrentLocation()
            const timeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => {
                console.log('[Clock In] ⏱️ Geolocation timeout after 60 seconds - giving up')
                resolve(null)
              }, 60000)
            })
            
            const locationData = await Promise.race([locationPromise, timeoutPromise])
            
            if (locationData) {
              console.log('[Clock In] ✅ Location obtained:', locationData)
              const success = await patchClockInGeolocation(timesheetId, locationData)
              if (!success) {
                console.error('[Clock In] ❌❌❌ FAILED to save geolocation - verification failed!')
              }
            } else {
              console.log('[Clock In] ⚠️ Geolocation returned null')
            }
          } catch (geoError) {
            console.error('[Clock In] ❌ Error getting/saving geolocation:', geoError)
          }
        } else {
          console.log('[Clock In] ⏭️ Skipping geolocation (disabled or no timesheet ID)')
        }
        
        console.log('[Clock In] ✅✅✅ COMPLETE: Clock-in process finished')
      }

      const actionMessage = isClockIn 
        ? 'Clocked in successfully' 
        : isClockOut 
        ? 'Clocked out successfully' 
        : 'Timesheet entry saved successfully'
      
      toast({
        title: 'Success',
        description: actionMessage
      })

      // Refresh active clock-in status
      await checkActiveClockIn()
      onClose()
    } catch (error: any) {
      // Handle network errors or other exceptions that weren't caught above
      const errorMessage = error.message || 'Failed to save timesheet entry'
      const isOverlapError = errorMessage.toLowerCase().includes('overlap') || 
                            errorMessage.toLowerCase().includes('overlapping')
      
      toast({
        title: isOverlapError ? '⛔ Time Overlap Detected' : 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: isOverlapError ? 8000 : 5000 // Show overlap errors longer
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveJobEntry = async () => {
    if (!selectedJobId || !selectedLaborCodeId || !jobStartTime) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      const selectedJob = Array.isArray(jobs) ? jobs.find(j => j.id === selectedJobId) : null
      const selectedLaborCode = Array.isArray(laborCodes) ? laborCodes.find(lc => lc.id === selectedLaborCodeId) : null

      if (!selectedJob || !selectedLaborCode) {
        throw new Error('Selected job or labor code not found')
      }

      const startTime24 = convert12To24Hour(jobStartTime)
      const roundedStart = roundTimeString(startTime24)
      const [startHours, startMinutes] = roundedStart.split(':').map(Number)

      // Create date using local date components to avoid timezone issues
      const year = entryDate.getFullYear()
      const month = entryDate.getMonth()
      const day = entryDate.getDate()
      const startDate = new Date(year, month, day, startHours, startMinutes, 0, 0)

      let endDate: Date | null = null
      if (jobEndTime) {
        const endTime24 = convert12To24Hour(jobEndTime)
        const roundedEnd = roundTimeString(endTime24)
        const [endHours, endMinutes] = roundedEnd.split(':').map(Number)
        endDate = new Date(year, month, day, endHours, endMinutes, 0, 0)
        
        // Validate that end time is after start time
        if (endDate <= startDate) {
          toast({
            title: 'Error',
            description: 'End time must be after start time',
            variant: 'destructive'
          })
          setIsSubmitting(false)
          return
        }
      }

      // Ensure timesheet exists first
      let timesheetId = selectedEntry?.id
      if (!timesheetId) {
        // First, try to find an existing timesheet for this date
        const year = entryDate.getFullYear()
        const month = entryDate.getMonth()
        const day = entryDate.getDate()
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        
        // Get start and end of day for the query
        const startOfDay = new Date(year, month, day, 0, 0, 0, 0)
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999)
        
        const existingResponse = await fetch(
          `/api/timesheets?userId=${userId}&startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`
        )
        
        if (existingResponse.ok) {
          const existingData = await existingResponse.json()
          const existingTimesheets = Array.isArray(existingData) ? existingData : (existingData.data || existingData.timesheets || [])
          
          // For job entries, ONLY use job-only timesheets
          // Job-only timesheets are identified by:
          // 1. Midnight clock-in (00:00) AND no clock-out, OR
          // 2. Already has job entries (regardless of clock-in/out)
          // NEVER use attendance timesheets (those with clock-out times and no job entries)
          const existingTimesheet = Array.isArray(existingTimesheets) 
            ? existingTimesheets.find((ts: any) => {
                const tsDate = new Date(ts.date)
                const dateMatches = tsDate.getFullYear() === year && 
                                   tsDate.getMonth() === month && 
                                   tsDate.getDate() === day
                
                if (!dateMatches) return false
                
                // Check if this timesheet already has job entries
                const hasJobEntries = ts.jobEntries && Array.isArray(ts.jobEntries) && ts.jobEntries.length > 0
                
                // If it has job entries, it's definitely a job-only timesheet
                if (hasJobEntries) {
                  return true
                }
                
                // Otherwise, check if it's a job-only timesheet (midnight entry, no clock-out)
                const clockIn = ts.clockInTime ? new Date(ts.clockInTime) : null
                const isMidnightEntry = clockIn && 
                                       clockIn.getHours() === 0 && 
                                       clockIn.getMinutes() === 0
                const hasNoClockOut = !ts.clockOutTime
                
                // Only use if it's midnight entry with no clock-out (job-only container)
                // Do NOT use if it has a clock-out (attendance entry)
                return isMidnightEntry && hasNoClockOut
              })
            : null
          
          if (existingTimesheet) {
            timesheetId = existingTimesheet.id
            console.log('[TimeEntryModal] Found existing job-only timesheet:', timesheetId)
          } else {
            console.log('[TimeEntryModal] No job-only timesheet found, will create new one')
          }
        }
        
        // If no job-only timesheet found, create a new one with midnight time (job-only timesheet)
        if (!timesheetId) {
          // Use midnight to minimize overlap issues
          const defaultClockIn = new Date(year, month, day, 0, 0, 0, 0)

          const response = await fetch('/api/timesheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clockInTime: defaultClockIn.toISOString(),
              date: dateStr
            })
          })

          let responseData
          try {
            responseData = await response.json()
          } catch (jsonError) {
            toast({
              title: 'Error',
              description: `Request failed: ${response.status} ${response.statusText}`,
              variant: 'destructive'
            })
            setIsSubmitting(false)
            return
          }
          
          if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || 'Failed to create timesheet'
            const errorDetails = responseData.details ? ` ${responseData.details}` : ''
            const fullErrorMessage = `${errorMessage}${errorDetails}`
            const isOverlapError = fullErrorMessage.toLowerCase().includes('overlap') || 
                                  fullErrorMessage.toLowerCase().includes('overlapping')
            
            console.error('[Time Entry Modal] Error creating timesheet (job entry):', {
              status: response.status,
              errorMessage,
              errorDetails,
              isOverlapError,
              fullErrorMessage,
              responseData
            })
            
            toast({
              title: isOverlapError ? '⛔ Time Overlap Detected' : 'Error',
              description: fullErrorMessage,
              variant: 'destructive',
              duration: isOverlapError ? 10000 : 5000 // Show overlap errors longer
            })
            setIsSubmitting(false)
            return
          }
          
          // Handle both direct response and wrapped response
          timesheetId = responseData.id || responseData.data?.id
          if (!timesheetId) {
            throw new Error('Failed to get timesheet ID from response')
          }
        }
      }

      // Create or update job entry
      if (selectedEntry?.jobEntries && Array.isArray(selectedEntry.jobEntries) && selectedEntry.jobEntries.length > 0) {
        // Update existing job entry
        const existingJob = selectedEntry.jobEntries[0]
        const response = await fetch(`/api/jobs/${existingJob.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            punchInTime: startDate.toISOString(),
            punchOutTime: endDate?.toISOString() || null,
            notes: notes || null
          })
        })

        const responseData = await response.json()
        
        if (!response.ok) {
          const errorMessage = responseData.error || 'Failed to update job entry'
          const errorDetails = responseData.details ? ` ${responseData.details}` : ''
          throw new Error(`${errorMessage}${errorDetails}`)
        }
      } else {
        // Create new job entry
        const response = await fetch(`/api/timesheets/${timesheetId}/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobNumber: selectedJob.jobNumber,
            laborCode: selectedLaborCode.code,
            punchInTime: startDate.toISOString(),
            punchOutTime: endDate?.toISOString() || null,
            notes: notes || null
          })
        })

        let responseData
        try {
          responseData = await response.json()
        } catch (jsonError) {
          toast({
            title: 'Error',
            description: `Request failed: ${response.status} ${response.statusText}`,
            variant: 'destructive'
          })
          setIsSubmitting(false)
          return
        }
        
        if (!response.ok) {
          const errorMessage = responseData.error || responseData.message || 'Failed to create job entry'
          const errorDetails = responseData.details ? ` ${responseData.details}` : ''
          const fullErrorMessage = `${errorMessage}${errorDetails}`
          const isOverlapError = fullErrorMessage.toLowerCase().includes('overlap') || 
                                fullErrorMessage.toLowerCase().includes('overlapping')
          
          console.error('[Time Entry Modal] Error creating job entry:', {
            status: response.status,
            errorMessage,
            errorDetails,
            isOverlapError,
            fullErrorMessage,
            responseData
          })
          
          toast({
            title: isOverlapError ? '⛔ Time Overlap Detected' : 'Error',
            description: fullErrorMessage,
            variant: 'destructive',
            duration: isOverlapError ? 10000 : 5000 // Show overlap errors longer
          })
          setIsSubmitting(false)
          return
        }
        
        // Verify response structure - handle both { success: true, data: {...} } and direct { id: ... } formats
        if (responseData.success && responseData.data) {
          // Response is wrapped: { success: true, data: { id: ... } }
          console.log('[Job Entry] Created successfully:', responseData.data.id)
        } else if (responseData.id) {
          // Response is direct: { id: ... }
          console.log('[Job Entry] Created successfully:', responseData.id)
        } else {
          console.error('[Job Entry] Unexpected response format:', responseData)
          throw new Error(responseData.error || 'Failed to create job entry - unexpected response format')
        }
      }

      toast({
        title: 'Success',
        description: 'Job entry saved successfully'
      })

      onClose()
    } catch (error: any) {
      // Handle network errors or other exceptions that weren't caught above
      const errorMessage = error.message || 'Failed to save job entry'
      const isOverlapError = errorMessage.toLowerCase().includes('overlap') || 
                            errorMessage.toLowerCase().includes('overlapping')
      
      toast({
        title: isOverlapError ? '⛔ Time Overlap Detected' : 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: isOverlapError ? 8000 : 5000 // Show overlap errors longer
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-auto">
        <DialogHeader className="pb-3 sm:pb-4 border-b relative">
          <div className="flex items-center justify-between pr-8 sm:pr-12">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-2xl font-bold truncate flex-1 min-w-0">
              {selectedEntry ? (
                <>
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <span className="hidden sm:inline">Edit Time Entry</span>
                  <span className="sm:hidden">Edit</span>
                </>
              ) : (
                <>
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <span className="hidden sm:inline">Add Time Entry</span>
                  <span className="sm:hidden">Add</span>
                </>
              )}
            </DialogTitle>
            <div className="flex items-center gap-1 sm:gap-2 absolute right-8 sm:right-12 top-0">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 hidden sm:block" />
              <SimpleDatePicker
                date={entryDate}
                setDate={(date) => date && setEntryDate(date)}
                placeholder="Select date"
                className="w-[140px] sm:w-auto"
              />
            </div>
          </div>
          <DialogDescription>
            {selectedEntry 
              ? `Edit an existing ${mode === 'clock' ? 'clock in/out entry' : 'job time entry'}` 
              : `Add a new ${mode === 'clock' ? 'clock in/out entry' : 'job time entry'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="w-full mt-4 sm:mt-6">
          {mode === 'clock' && (
            <div className="space-y-4 sm:space-y-6">
            {isAdmin && (
              <div className="space-y-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  Employee
                </Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(users) ? users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(() => {
              // Check if this is today - only allow clock in/out for today
              const today = startOfDay(new Date())
              const entryDay = startOfDay(entryDate)
              const isToday = entryDay.getTime() === today.getTime()
              
              if (!isToday) {
                // For past days, show read-only message
                return (
                  <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800 font-medium">
                      Clock in/out is only available for today. For past days, please use "Request Change" to add or modify time entries.
                    </p>
                  </div>
                )
              }
              
              // For today, show clock in/out buttons
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <LogIn className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      Clock In
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700">
                        {clockInTime || (hasActiveClockIn ? 'Already clocked in' : 'Click "Clock In" to record current time')}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const now = new Date()
                          const rounded = roundToNearest15Minutes(now)
                          setClockInTime(formatTime12Hour(rounded))
                        }}
                        disabled={!!clockInTime || hasActiveClockIn}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Clock In
                      </Button>
                    </div>
                    {hasActiveClockIn && !clockInTime && (
                      <p className="text-xs text-red-600 mt-1">You are already clocked in. Please clock out first.</p>
                    )}
                    {clockInTime && (
                      <p className="text-xs text-gray-500 mt-1">Clock-in time recorded. Use "Request Change" to modify.</p>
                    )}
                  </div>

                  <div className="space-y-2 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                    <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <LogOut className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                      Clock Out
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700">
                        {clockOutTime || (!hasActiveClockIn && !clockInTime ? 'Clock in first to clock out' : 'Click "Clock Out" to record current time')}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const now = new Date()
                          const rounded = roundToNearest15Minutes(now)
                          handleClockOutTimeChange(formatTime12Hour(rounded))
                        }}
                        disabled={!!clockOutTime || (!hasActiveClockIn && !clockInTime)}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Clock Out
                      </Button>
                    </div>
                    {!hasActiveClockIn && !clockInTime && (
                      <p className="text-xs text-red-600 mt-1">You must clock in first before you can clock out.</p>
                    )}
                  </div>
                </div>
              )
            })()}

            {clockInTime && clockOutTime && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Total Hours</div>
                    <div className="text-3xl font-bold text-blue-700">
                      {calculateHoursBetween(
                        new Date(`${format(entryDate, 'yyyy-MM-dd')} ${convert12To24Hour(clockInTime)}`),
                        new Date(`${format(entryDate, 'yyyy-MM-dd')} ${convert12To24Hour(clockOutTime)}`)
                      ).toFixed(2)}h
                    </div>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <Clock className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </div>
            )}

            {/* Request Change Button - ONLY for attendance (clock mode), NOT for job entries */}
            {mode === 'clock' && (() => {
              const today = startOfDay(new Date())
              const entryDay = startOfDay(entryDate)
              const isPastDay = entryDay.getTime() < today.getTime()
              const isToday = entryDay.getTime() === today.getTime()
              const hasEntry = clockInTime || clockOutTime
              
              // Show for all days (today and past) or when there's an entry
              // This allows users to request changes for today as well
              return (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsChangeRequestOpen(true)}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {!hasEntry ? 'Request Time Entry' : 'Request Change'}
                  </Button>
                </div>
              )
            })()}

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t">
              {selectedEntry && (
                <Button 
                  variant="outline"
                  onClick={async () => {
                    // Check if entry is locked
                    if ((selectedEntry as any).isLocked) {
                      toast({
                        title: 'Entry Locked',
                        description: 'This entry has been submitted for approval and cannot be deleted.',
                        variant: 'default'
                      })
                      return
                    }
                    
                    if (!confirm('Are you sure you want to delete this timesheet entry? This will also delete all associated job entries. This action cannot be undone.')) {
                      return
                    }
                    setIsSubmitting(true)
                    try {
                      const response = await fetch(`/api/timesheets/${selectedEntry.id}`, {
                        method: 'DELETE'
                      })
                      if (!response.ok) {
                        const error = await response.json()
                        throw new Error(error.error || 'Failed to delete timesheet')
                      }
                      toast({
                        title: 'Success',
                        description: 'Timesheet entry deleted successfully'
                      })
                      onClose()
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message || 'Failed to delete timesheet',
                        variant: 'destructive'
                      })
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  disabled={(selectedEntry as any).isLocked || isSubmitting}
                  className="h-11 text-sm sm:text-base font-medium border-red-300 text-red-700 hover:bg-red-50 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Entry
                </Button>
              )}
              <div className="flex gap-3 w-full sm:w-auto sm:ml-auto">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1 sm:flex-initial min-w-[100px] h-11 text-sm sm:text-base font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                {(() => {
                  // Check if this is today - only allow saving for today
                  const today = startOfDay(new Date())
                  const entryDay = startOfDay(entryDate)
                  const isToday = entryDay.getTime() === today.getTime()
                  
                  if (!isToday) {
                    // For past days, hide Save button (only Request Change is available)
                    return null
                  }
                  
                  // For today, show Save button
                  return (
                    <Button 
                      onClick={handleSaveClockInOut} 
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-initial min-w-[120px] h-11 text-sm sm:text-base font-semibold bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Save Entry
                        </>
                      )}
                    </Button>
                  )
                })()}
              </div>
            </div>
            </div>
          )}

          {mode === 'job' && (
            <div className="space-y-4 sm:space-y-6">
            {isAdmin && (
              <div className="space-y-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  Employee
                </Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(users) ? users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  Start Time *
                </Label>
                <div className="flex items-center gap-2">
                  <TimePicker
                    value={jobStartTime}
                    onChange={setJobStartTime}
                    className="flex-1 bg-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      setJobStartTime(formatTime12Hour(rounded))
                    }}
                    className="bg-white hover:bg-green-50 border-green-300 text-green-700 font-medium min-w-[60px]"
                  >
                    Now
                  </Button>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-red-50 rounded-lg border border-red-200">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-600" />
                  End Time (Optional)
                </Label>
                <div className="flex items-center gap-2">
                  <TimePicker
                    value={jobEndTime}
                    onChange={handleJobEndTimeChange}
                    className="flex-1 bg-white"
                    minTime={jobStartTime || undefined} // Can't select job end before job start
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      handleJobEndTimeChange(formatTime12Hour(rounded))
                    }}
                    className="bg-white hover:bg-red-50 border-red-300 text-red-700 font-medium min-w-[60px]"
                  >
                    Now
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  Job Number *
                </Label>
                <SearchableSelect
                  options={Array.isArray(jobs) ? jobs.map(job => ({
                    value: job.id,
                    label: `${job.jobNumber} - ${job.title}`,
                    searchText: `${job.jobNumber} ${job.title}`
                  })) : []}
                  value={selectedJobId}
                  onValueChange={setSelectedJobId}
                  placeholder="Search or select job..."
                  emptyMessage="No jobs found"
                />
              </div>

              <div className="space-y-2 p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                  Phase Code (Labor Code) *
                </Label>
                <Select value={selectedLaborCodeId} onValueChange={setSelectedLaborCodeId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Labor Code" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(laborCodes) ? laborCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.code} - {code.name}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                Notes (Optional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this job entry..."
                rows={3}
                className="bg-white"
              />
            </div>

            {jobStartTime && jobEndTime && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Duration</div>
                    <div className="text-3xl font-bold text-blue-700">
                      {calculateHoursBetween(
                        new Date(`${format(entryDate, 'yyyy-MM-dd')} ${convert12To24Hour(jobStartTime)}`),
                        new Date(`${format(entryDate, 'yyyy-MM-dd')} ${convert12To24Hour(jobEndTime)}`)
                      ).toFixed(2)}h
                    </div>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <Clock className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t">
              {selectedEntry && selectedEntry.jobEntries.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={async () => {
                    if (!confirm('Are you sure you want to delete this job entry? This action cannot be undone.')) {
                      return
                    }
                    setIsSubmitting(true)
                    try {
                      const jobEntryId = selectedEntry.jobEntries[0].id
                      const response = await fetch(`/api/jobs/${jobEntryId}`, {
                        method: 'DELETE'
                      })
                      if (!response.ok) {
                        const error = await response.json()
                        throw new Error(error.error || 'Failed to delete job entry')
                      }
                      toast({
                        title: 'Success',
                        description: 'Job entry deleted successfully'
                      })
                      onClose()
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message || 'Failed to delete job entry',
                        variant: 'destructive'
                      })
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  disabled={isSubmitting}
                  className="h-11 text-sm sm:text-base font-medium border-red-300 text-red-700 hover:bg-red-50 w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Job Entry
                </Button>
              )}
              <div className="flex gap-3 w-full sm:w-auto sm:ml-auto">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1 sm:flex-initial min-w-[100px] h-11 text-sm sm:text-base font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveJobEntry} 
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial min-w-[120px] h-11 text-sm sm:text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Save Entry
                    </>
                  )}
                </Button>
              </div>
            </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Change Request Modal */}
      <Dialog open={isChangeRequestOpen} onOpenChange={setIsChangeRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Time Change</DialogTitle>
            <DialogDescription>
              Request a change to your clock-in or clock-out time. This will require admin approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="change-clock-in">Clock In Time</Label>
              <div className="flex items-center gap-2">
                <TimePicker
                  value={changeRequestClockIn || clockInTime}
                  onChange={setChangeRequestClockIn}
                  className="flex-1 bg-white text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="change-clock-out">Clock Out Time (Optional)</Label>
              <div className="flex items-center gap-2">
                <TimePicker
                  value={changeRequestClockOut || clockOutTime}
                  onChange={setChangeRequestClockOut}
                  className="flex-1 bg-white text-sm"
                  minTime={changeRequestClockIn || clockInTime || undefined}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="change-note">Reason for Change *</Label>
              <Textarea
                id="change-note"
                value={changeRequestNote}
                onChange={(e) => setChangeRequestNote(e.target.value)}
                placeholder="Please explain why you need to change the time..."
                rows={4}
                className="bg-white"
                required
              />
              <p className="text-xs text-gray-500">A reason is required for all change requests.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsChangeRequestOpen(false)
                setChangeRequestNote('')
                setChangeRequestClockIn('')
                setChangeRequestClockOut('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!changeRequestNote.trim()) {
                  toast({
                    title: 'Error',
                    description: 'Please provide a reason for the change request',
                    variant: 'destructive'
                  })
                  return
                }

                setIsSubmitting(true)
                try {
                  // Convert time strings to Date objects
                  const year = entryDate.getFullYear()
                  const month = entryDate.getMonth()
                  const day = entryDate.getDate()
                  
                  // Parse clock in time
                  const clockInTimeToUse = changeRequestClockIn || clockInTime
                  const clockIn24 = convert12To24Hour(clockInTimeToUse)
                  const [inHours, inMinutes] = clockIn24.split(':').map(Number)
                  const requestedClockInDate = new Date(year, month, day, inHours, inMinutes, 0, 0)
                  
                  // Parse clock out time if provided
                  let requestedClockOutDate: Date | null = null
                  const clockOutTimeToUse = changeRequestClockOut || clockOutTime
                  if (clockOutTimeToUse) {
                    const clockOut24 = convert12To24Hour(clockOutTimeToUse)
                    const [outHours, outMinutes] = clockOut24.split(':').map(Number)
                    requestedClockOutDate = new Date(year, month, day, outHours, outMinutes, 0, 0)
                  }
                  
                  const response = await fetch('/api/time-change-requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      timesheetId: selectedEntry?.id,
                      requestedClockInTime: requestedClockInDate.toISOString(),
                      requestedClockOutTime: requestedClockOutDate?.toISOString() || null,
                      reason: changeRequestNote,
                      date: format(entryDate, 'yyyy-MM-dd')
                    })
                  })

                  if (response.ok) {
                    const result = await response.json()
                    toast({
                      title: 'Success',
                      description: result.message || 'Change request submitted successfully. Waiting for admin approval.',
                      duration: 5000
                    })
                    setIsChangeRequestOpen(false)
                    setChangeRequestNote('')
                    setChangeRequestClockIn('')
                    setChangeRequestClockOut('')
                    onClose()
                    // Reload data to show the change request status
                    // Trigger a refresh
                    window.location.reload()
                  } else {
                    // Parse error response
                    let errorMessage = 'Failed to submit change request'
                    let errorDetails = ''
                    let errorData: any = {}
                    
                    try {
                      const errorText = await response.text()
                      console.error('[Time Entry Modal] Raw error response:', errorText)
                      
                      if (errorText) {
                        try {
                          errorData = JSON.parse(errorText)
                          errorMessage = errorData.error || errorData.message || errorMessage
                          errorDetails = errorData.details ? ` ${errorData.details}` : ''
                        } catch (parseError) {
                          // If JSON parsing fails, use the text as the error message
                          errorMessage = errorText || `Request failed: ${response.status} ${response.statusText}`
                        }
                      } else {
                        errorMessage = `Request failed: ${response.status} ${response.statusText}`
                      }
                    } catch (parseError) {
                      // If text parsing fails, use status text
                      console.error('[Time Entry Modal] Failed to parse error response:', parseError)
                      errorMessage = `Request failed: ${response.status} ${response.statusText}`
                    }
                    
                    const fullErrorMessage = `${errorMessage}${errorDetails}`.trim()
                    const isOverlapError = fullErrorMessage.toLowerCase().includes('overlap') || 
                                          fullErrorMessage.toLowerCase().includes('overlapping')
                    
                    console.error('[Time Entry Modal] Error submitting change request:', {
                      status: response.status,
                      statusText: response.statusText,
                      errorMessage,
                      errorDetails,
                      errorData,
                      isOverlapError,
                      fullErrorMessage
                    })
                    
                    toast({
                      title: isOverlapError ? '⛔ Time Overlap Detected' : 'Error',
                      description: fullErrorMessage,
                      variant: 'destructive',
                      duration: isOverlapError ? 10000 : 5000 // Show overlap errors longer
                    })
                    
                    // Don't throw - we've already shown the error
                    return
                  }
                } catch (error: any) {
                  // Handle network errors or other exceptions
                  const errorMessage = error.message || 'Failed to submit change request'
                  const isOverlapError = errorMessage.toLowerCase().includes('overlap') || 
                                        errorMessage.toLowerCase().includes('overlapping')
                  
                  toast({
                    title: isOverlapError ? '⛔ Time Overlap Detected' : 'Error',
                    description: errorMessage,
                    variant: 'destructive',
                    duration: isOverlapError ? 8000 : 5000 // Show overlap errors longer
                  })
                } finally {
                  setIsSubmitting(false)
                }
              }}
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

