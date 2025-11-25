'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, LogIn, LogOut, Play, Square, Calendar, User, FileText, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { roundTimeString, formatTime24Hour, formatTime12Hour, getDateOnly, calculateHoursBetween, convert12To24Hour, convert24To12Hour, roundToNearest15Minutes } from '@/lib/utils/time-rounding'
import { useToast } from '@/components/ui/use-toast'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { TimePicker } from '@/components/ui/time-picker'

interface PunchInOutTimesheetProps {
  userId: string
  userName: string
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

interface Timesheet {
  id: string
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

export function PunchInOutTimesheet({ userId, userName }: PunchInOutTimesheetProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Timesheet state
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null)
  const [clockInTime, setClockInTime] = useState<string>('')
  const [clockInTimeEditable, setClockInTimeEditable] = useState<string>('')
  const [isEditingClockIn, setIsEditingClockIn] = useState(false)
  const [clockOutTime, setClockOutTime] = useState<string>('')
  const [clockOutTimeEditable, setClockOutTimeEditable] = useState<string>('')
  const [isEditingClockOut, setIsEditingClockOut] = useState(false)
  const [totalHours, setTotalHours] = useState<number>(0)
  const [status, setStatus] = useState<'idle' | 'clocked-in' | 'clocked-out' | 'on-lunch'>('idle')
  const [isOnLunch, setIsOnLunch] = useState(false)
  
  // Job tracking state
  const [jobs, setJobs] = useState<Job[]>([])
  const [laborCodes, setLaborCodes] = useState<LaborCode[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [selectedLaborCodeId, setSelectedLaborCodeId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [activeJobEntry, setActiveJobEntry] = useState<JobEntry | null>(null)
  const [jobPunchInTime, setJobPunchInTime] = useState<string>('')
  const [jobPunchInTimeEditable, setJobPunchInTimeEditable] = useState<string>('')
  const [jobPunchOutTime, setJobPunchOutTime] = useState<string>('')
  const [jobPunchOutTimeEditable, setJobPunchOutTimeEditable] = useState<string>('')
  
  // Timesheet grid state
  const [timesheetEntries, setTimesheetEntries] = useState<Timesheet[]>([])
  const [filteredEntries, setFilteredEntries] = useState<Timesheet[]>([])
  
  // Editing state
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  
  // Filter state
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Calendar state - start of current week (Sunday)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date()
    const day = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const diff = today.getDate() - day // Get Sunday
    const sunday = new Date(today.setDate(diff))
    sunday.setHours(0, 0, 0, 0)
    return sunday
  })
  
  // Date picker for clock in/out
  const [selectedDate, setSelectedDate] = useState<string>('')
  // Date picker for job tracking (separate from clock in/out date)
  const [jobTrackingDate, setJobTrackingDate] = useState<string>('')

  const isInitialMount = useRef(true)
  const skipNextSave = useRef(false)

  // Load initial data
  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Load draft from database on mount
  useEffect(() => {
    if (isInitialMount.current) {
      loadDraftFromDatabase()
      isInitialMount.current = false
    }
  }, [userId])

  // Save draft to database when timesheet state changes
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    if (isInitialMount.current) {
      return
    }

    if (status === 'clocked-in' && currentTimesheet) {
      saveDraftToDatabase()
    } else if (status === 'idle' || status === 'clocked-out') {
      // Draft is automatically cleared when timesheet is completed
      // No need to explicitly clear it
    }
  }, [status, currentTimesheet, selectedJobId, selectedLaborCodeId, notes, activeJobEntry, userId])

  const loadDraftFromDatabase = async () => {
    try {
      const response = await fetch('/api/timesheets/draft')
      if (response.ok) {
        const data = await response.json()
        if (data.draft) {
          console.log('[Timesheet] 📦 Loaded draft from database:', data.draft)
          // Draft data will be merged when we load the current timesheet
          skipNextSave.current = true
        }
      }
    } catch (error) {
      console.error('[Timesheet] Error loading draft from database:', error)
    }
  }

  const saveDraftToDatabase = async () => {
    if (!currentTimesheet) return

      try {
        const draft = {
          timesheetId: currentTimesheet.id,
        selectedJobId: selectedJobId || undefined,
        selectedLaborCodeId: selectedLaborCodeId || undefined,
        notes: notes || undefined,
          activeJobEntryId: activeJobEntry?.id || null,
      }

      const response = await fetch('/api/timesheets/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      })

      if (response.ok) {
        console.log('[Timesheet] 💾 Saved draft to database')
      } else {
        console.error('[Timesheet] Failed to save draft:', await response.text())
      }
      } catch (error) {
      console.error('[Timesheet] Error saving draft to database:', error)
      }
    }

  // Sync with server on mount and periodically
  useEffect(() => {
    if (!currentTimesheet || status !== 'clocked-in') return

    // Sync every 30 seconds to ensure server is up-to-date
    const syncInterval = setInterval(async () => {
      try {
        await loadCurrentTimesheet()
        console.log('[Timesheet] 🔄 Synced with server')
      } catch (error) {
        console.error('[Timesheet] Error syncing with server:', error)
      }
    }, 30000) // 30 seconds

    return () => clearInterval(syncInterval)
  }, [currentTimesheet, status])

  // Filter entries to current week for calendar view
  useEffect(() => {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    
    let filtered = [...timesheetEntries]
    
    // Filter to current week
    filtered = filtered.filter(ts => {
      const tsDate = new Date(ts.date)
      return tsDate >= currentWeekStart && tsDate <= weekEnd
    })
    
    // Also apply date range filters if set
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart)
      filtered = filtered.filter(ts => new Date(ts.date) >= startDate)
    }

    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(ts => new Date(ts.date) <= endDate)
    }

    // Sort by date and time
    filtered.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateDiff !== 0) return dateDiff
      return new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime()
    })

    setFilteredEntries(filtered)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timesheetEntries, currentWeekStart, dateRangeStart, dateRangeEnd])

  // Get week days (Sunday to Saturday)
  const getWeekDays = () => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart)
      day.setDate(currentWeekStart.getDate() + i)
      days.push(day)
    }
    return days
  }

  // Get timesheets for a specific date
  const getTimesheetsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return filteredEntries.filter(ts => {
      const tsDateStr = new Date(ts.date).toISOString().split('T')[0]
      return tsDateStr === dateStr
    })
  }

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart)
    if (direction === 'prev') {
      newWeekStart.setDate(newWeekStart.getDate() - 7)
    } else {
      newWeekStart.setDate(newWeekStart.getDate() + 7)
    }
    setCurrentWeekStart(newWeekStart)
  }

  // Go to current week
  const goToCurrentWeek = () => {
    const today = new Date()
    const day = today.getDay() // 0 = Sunday
    const diff = today.getDate() - day // Get Sunday
    const sunday = new Date(today.setDate(diff))
    sunday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(sunday)
  }
  
  // Format week range for display
  const getWeekRangeString = () => {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startStr} - ${endStr}`
  }

  // Calculate totals
  const calculateDailyTotal = (timesheet: Timesheet): number => {
    // If timesheet has clock out time, use the stored totalHours
    // Otherwise, calculate from clock in to now
    if (timesheet.clockOutTime) {
      return timesheet.totalHours || 0
    } else {
      // Still clocked in - calculate from clock in to now
      return calculateHoursBetween(new Date(timesheet.clockInTime), new Date())
    }
  }

  const calculateOverallTotal = (): number => {
    return filteredEntries.reduce((sum, ts) => sum + calculateDailyTotal(ts), 0)
  }

  const calculateJobTotal = (jobEntry: JobEntry): number => {
    if (jobEntry.punchOutTime) {
      return calculateHoursBetween(new Date(jobEntry.punchInTime), new Date(jobEntry.punchOutTime))
    }
    return calculateHoursBetween(new Date(jobEntry.punchInTime), new Date())
  }

  // Update active job selection when jobs/laborCodes load
  useEffect(() => {
    if (activeJobEntry && jobs.length > 0 && laborCodes.length > 0) {
      const job = jobs.find(j => j.jobNumber === activeJobEntry.jobNumber)
      const laborCode = laborCodes.find(lc => lc.code === activeJobEntry.laborCode)
      if (job && !selectedJobId) setSelectedJobId(job.id)
      if (laborCode && !selectedLaborCodeId) setSelectedLaborCodeId(laborCode.id)
      if (activeJobEntry.notes && !notes) setNotes(activeJobEntry.notes)
    }
  }, [activeJobEntry, jobs, laborCodes, selectedJobId, selectedLaborCodeId, notes])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // Load jobs and labor codes first
      await Promise.all([
        loadJobs(),
        loadLaborCodes(),
        loadTimesheets()
      ])
      // Then load current timesheet (needs jobs/laborCodes for matching)
      await loadCurrentTimesheet()
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data. Please refresh the page.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadJobs = async () => {
    try {
      console.log('[Jobs] Fetching jobs from /api/jobs')
      const response = await fetch('/api/jobs')
      console.log('[Jobs] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[Jobs] Received data:', data.length, 'items')
        console.log('[Jobs] Sample jobs:', data.slice(0, 3).map((j: any) => ({ 
          jobNumber: j.jobNumber, 
          type: j.type, 
          status: j.status, 
          title: j.title 
        })))
        
        // API already filters COMPLETED, so use all data
        setJobs(data)
        console.log('[Jobs] Set jobs state:', data.length, 'items')
      } else {
        console.error('[Jobs] Failed to load jobs:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('[Jobs] Error details:', errorData)
        toast({
          title: 'Error',
          description: `Failed to load jobs: ${errorData.error || response.statusText}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('[Jobs] Error loading jobs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load jobs. Please refresh the page.',
        variant: 'destructive'
      })
    }
  }

  const loadLaborCodes = async () => {
    try {
      const response = await fetch('/api/labor-codes?isActive=true')
      if (response.ok) {
        const data = await response.json()
        setLaborCodes(data)
      }
    } catch (error) {
      console.error('Error loading labor codes:', error)
    }
  }

  const loadTimesheets = async () => {
    try {
      const response = await fetch(`/api/timesheets?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setTimesheetEntries(data)
      }
    } catch (error) {
      console.error('Error loading timesheets:', error)
    }
  }

  const loadCurrentTimesheet = async () => {
    try {
      const today = getDateOnly(new Date())
      const response = await fetch(`/api/timesheets?userId=${userId}&date=${today}`)
      if (response.ok) {
        const data = await response.json()
        // Find today's in-progress timesheet (including lunch breaks)
        const todayTimesheet = data.find((ts: Timesheet) => {
          const tsDate = getDateOnly(new Date(ts.date))
          return tsDate === today && (ts.status === 'in-progress' || (ts.status === 'in-progress' && ts.clockOutTime))
        })

        if (todayTimesheet) {
          // Server data is authoritative - always use it
          setCurrentTimesheet(todayTimesheet)
          const clockIn12 = formatTime12Hour(new Date(todayTimesheet.clockInTime))
          setClockInTime(clockIn12)
          setClockInTimeEditable(clockIn12)
          if (todayTimesheet.clockOutTime) {
            // Check if it's a lunch break (clocked out but status is still in-progress)
            if (todayTimesheet.status === 'in-progress') {
              setClockOutTime(formatTime12Hour(new Date(todayTimesheet.clockOutTime)))
              setClockOutTimeEditable(formatTime12Hour(new Date(todayTimesheet.clockOutTime)))
              setStatus('on-lunch')
              setIsOnLunch(true)
            } else {
              setClockOutTime(formatTime12Hour(new Date(todayTimesheet.clockOutTime)))
              setClockOutTimeEditable(formatTime12Hour(new Date(todayTimesheet.clockOutTime)))
              setStatus('clocked-out')
              setIsOnLunch(false)
            }
          } else {
            setStatus('clocked-in')
            setIsOnLunch(false)
          }
          setTotalHours(todayTimesheet.totalHours || 0)
          
          // Find active job entry
          const activeJob = todayTimesheet.jobEntries?.find((je: JobEntry) => !je.punchOutTime)
          if (activeJob) {
            setActiveJobEntry(activeJob)
            
            // Try to match job and labor code
            const job = jobs.find(j => j.jobNumber === activeJob.jobNumber)
            const laborCode = laborCodes.find(lc => lc.code === activeJob.laborCode)
            if (job) setSelectedJobId(job.id)
            if (laborCode) setSelectedLaborCodeId(laborCode.id)
            if (activeJob.notes) setNotes(activeJob.notes)
          } else {
            setActiveJobEntry(null)
            
            // Try to restore draft selections from database if no active job
              try {
              const draftResponse = await fetch('/api/timesheets/draft')
              if (draftResponse.ok) {
                const draftData = await draftResponse.json()
                if (draftData.draft && draftData.draft.timesheetId === todayTimesheet.id) {
                  const draft = draftData.draft
                    if (draft.selectedJobId && jobs.find(j => j.id === draft.selectedJobId)) {
                      setSelectedJobId(draft.selectedJobId)
                    }
                    if (draft.selectedLaborCodeId && laborCodes.find(lc => lc.id === draft.selectedLaborCodeId)) {
                      setSelectedLaborCodeId(draft.selectedLaborCodeId)
                    }
                    if (draft.notes) {
                      setNotes(draft.notes)
                    }
                  console.log('[Timesheet] ✅ Restored draft selections from database')
                  }
                }
              } catch (error) {
                console.error('[Timesheet] Error restoring draft:', error)
            }
          }
        } else {
          setCurrentTimesheet(null)
          setStatus('idle')
          setClockInTime('')
          setClockOutTime('')
          setTotalHours(0)
          setActiveJobEntry(null)
        }
      }
    } catch (error) {
      console.error('Error loading current timesheet:', error)
    }
  }

  const handleClockIn = async () => {
    setIsSubmitting(true)
    
    try {
      console.log('[Clock In] Starting clock in process...')
      
      // Get current time once at the start
      const now = new Date()
      
      // Get the time value - use editable if available, otherwise use current time
      let timeValue = clockInTimeEditable || clockInTime || ''
      
      let clockInDate: Date
      let roundedTime: string
      
      if (timeValue && timeValue.trim() !== '') {
        // User provided a time
        console.log('[Clock In] Time value:', timeValue)
        
        // Parse and convert 12-hour to 24-hour format
        let time24: string
        try {
          if (timeValue.includes('AM') || timeValue.includes('PM')) {
            time24 = convert12To24Hour(timeValue)
            console.log('[Clock In] Converted to 24-hour:', time24)
          } else {
            // Assume it's already 24-hour format
            time24 = timeValue
            console.log('[Clock In] Using as 24-hour:', time24)
          }
        } catch (e: any) {
          console.error('[Clock In] Time conversion error:', e)
          throw new Error(`Invalid time format: ${timeValue}. Please use format like "8:00 AM"`)
        }
        
        // Round the time to nearest 15 minutes
        roundedTime = roundTimeString(time24)
        console.log('[Clock In] Rounded time:', roundedTime)
        
        const [hours, minutes] = roundedTime.split(':').map(Number)
        
        // Create clock in date - use today's date with the specified time
        clockInDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hours,
          minutes,
          0,
          0
        )
      } else {
        // No time provided - use current time rounded to nearest 15 minutes
        console.log('[Clock In] No time provided, using current time')
        roundedTime = roundTimeString(formatTime24Hour(now))
        console.log('[Clock In] Rounded current time:', roundedTime)
        
        const [hours, minutes] = roundedTime.split(':').map(Number)
        clockInDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hours,
          minutes,
          0,
          0
        )
      }
      
      console.log('[Clock In] Clock in date:', clockInDate.toISOString())
      
      // Use selected date or today
      let timesheetDate: Date
      if (selectedDate) {
        const [year, month, day] = selectedDate.split('-').map(Number)
        timesheetDate = new Date(year, month - 1, day, 0, 0, 0, 0)
      } else {
        timesheetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      }
      
      console.log('[Clock In] Timesheet date:', timesheetDate.toISOString())
      console.log('[Clock In] Sending request to /api/timesheets')

      // Make API request immediately (non-blocking)
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clockInTime: clockInDate.toISOString(),
          date: timesheetDate.toISOString(),
          geoLat: null, // Will be updated in background
          geoLon: null,
          geoAccuracy: null,
        })
      })

      console.log('[Clock In] Response status:', response.status)
      console.log('[Clock In] Response ok:', response.ok)

      const responseData = await response.json()

      // Update geolocation in background (non-blocking)
      if (response.ok && responseData.id) {
        getCurrentLocation().then((location) => {
          if (location) {
            console.log('[Clock In] Updating geolocation in background:', location)
            fetch(`/api/timesheets/${responseData.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                geoLat: location.lat,
                geoLon: location.lon,
                geoAccuracy: location.accuracy,
              })
            }).then(() => {
              // Refresh timesheet data after geolocation update
              loadTimesheets()
              loadCurrentTimesheet()
            }).catch(err => console.error('[Clock In] Failed to update geolocation:', err))
          }
        }).catch(err => console.error('[Clock In] Failed to get geolocation:', err))
      }
      console.log('[Clock In] Response data:', responseData)

      if (!response.ok) {
        const errorMessage = responseData.details || responseData.error || 'Failed to clock in'
        console.error('[Clock In] Error response:', errorMessage)
        throw new Error(errorMessage)
      }

      // Success - update UI
      const timesheet = responseData
      console.log('[Clock In] Success! Timesheet created:', timesheet.id)
      
      setCurrentTimesheet(timesheet)
      
      // Convert rounded 24-hour time to 12-hour for display
      const roundedTime12 = convert24To12Hour(roundedTime)
      setClockInTime(roundedTime12)
      setClockInTimeEditable(roundedTime12)
      setIsEditingClockIn(false)
      setStatus('clocked-in')
      
      toast({
        title: 'Success',
        description: `Clocked in at ${roundedTime12}`
      })

      // Reload timesheets to refresh the grid
      await loadTimesheets()
      
    } catch (error: any) {
      console.error('[Clock In] Full error:', error)
      console.error('[Clock In] Error message:', error.message)
      console.error('[Clock In] Error stack:', error.stack)
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock in. Please check the console for details.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCurrentLocation = (): Promise<{ lat: number; lon: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      const positions: GeolocationPosition[] = []
      let watchId: number | null = null
      const minReadings = 8 // Minimum readings before calculating average
      const maxReadings = 15 // Maximum readings to collect
      const minAccuracy = 5 // Target accuracy in meters (very high accuracy)
      const maxWaitTime = 30000 // Maximum 30 seconds total
      const stabilizationTime = 2000 // Wait 2 seconds after last reading to ensure stability

      const options = {
        enableHighAccuracy: true,  // Use GPS for better accuracy
        timeout: 30000,            // Increased timeout for GPS fix
        maximumAge: 0,             // Force fresh reading, don't use cache
      }

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
          return distance < 50 // Filter out readings more than 50m from median
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
              resolve(result)
            } else {
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

  const handleClockOut = async () => {
    if (!currentTimesheet) {
      toast({
        title: 'Error',
        description: 'No active timesheet found',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      console.log('[Clock Out] Starting clock out process...')
      console.log('[Clock Out] Current timesheet:', currentTimesheet.id)
      
      // Use editable time if set, otherwise use current time
      let timeValue = clockOutTimeEditable || clockOutTime
      console.log('[Clock Out] Time value:', timeValue)
      
      let clockOutDate: Date
      if (timeValue && timeValue.trim() !== '' && (timeValue.includes('AM') || timeValue.includes('PM'))) {
        // Convert 12-hour to 24-hour
        const time24 = convert12To24Hour(timeValue)
        const roundedTime = roundTimeString(time24)
        console.log('[Clock Out] Converted and rounded:', roundedTime)
        const [hours, minutes] = roundedTime.split(':').map(Number)
        clockOutDate = new Date()
        clockOutDate.setHours(hours, minutes, 0, 0)
        clockOutDate.setSeconds(0)
        clockOutDate.setMilliseconds(0)
      } else {
        // Use current time
        clockOutDate = new Date()
        const roundedClockOut = roundTimeString(formatTime24Hour(clockOutDate))
        console.log('[Clock Out] Using current time, rounded:', roundedClockOut)
        const [hours, minutes] = roundedClockOut.split(':').map(Number)
        clockOutDate.setHours(hours, minutes, 0, 0)
        clockOutDate.setSeconds(0)
        clockOutDate.setMilliseconds(0)
      }

      // Validate clock out is after clock in
      const clockInDate = new Date(currentTimesheet.clockInTime)
      if (clockOutDate <= clockInDate) {
        const clockInTime12 = formatTime12Hour(clockInDate)
        const clockOutTime12 = formatTime12Hour(clockOutDate)
        toast({
          title: 'Invalid Time',
          description: `Clock out time (${clockOutTime12}) must be after clock in time (${clockInTime12})`,
          variant: 'destructive'
        })
        setIsSubmitting(false)
        return
      }

      // Send clock out immediately (non-blocking)
      console.log('[Clock Out] Clock out date:', clockOutDate.toISOString())
      console.log('[Clock Out] Sending PATCH to /api/timesheets/' + currentTimesheet.id)

      // Send request immediately without waiting for geolocation
      const response = await fetch(`/api/timesheets/${currentTimesheet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clockOutTime: clockOutDate.toISOString(),
          status: 'in-progress', // Keep in-progress so they can clock back in
          clockOutGeoLat: null, // Will be updated in background
          clockOutGeoLon: null,
          clockOutGeoAccuracy: null,
        })
      })

      // Update geolocation in background (non-blocking)
      getCurrentLocation().then((location) => {
        if (location) {
          console.log('[Clock Out] Updating geolocation in background:', location)
          fetch(`/api/timesheets/${currentTimesheet.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clockOutGeoLat: location.lat,
              clockOutGeoLon: location.lon,
              clockOutGeoAccuracy: location.accuracy,
            })
          }).then(() => {
            // Refresh timesheet data after geolocation update
            loadTimesheets()
            loadCurrentTimesheet()
          }).catch(err => console.error('[Clock Out] Failed to update geolocation:', err))
        }
      }).catch(err => console.error('[Clock Out] Failed to get geolocation:', err))

      console.log('[Clock Out] Response status:', response.status)
      console.log('[Clock Out] Response ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[Clock Out] Error response:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to clock out')
      }

      const updated = await response.json()
      console.log('[Clock Out] Success! Updated timesheet:', updated.id)
      
      setCurrentTimesheet(updated)
      const roundedTime12 = convert24To12Hour(formatTime24Hour(clockOutDate))
      setClockOutTime(roundedTime12)
      setClockOutTimeEditable(roundedTime12)
      setIsEditingClockOut(false)
      setStatus('on-lunch') // Use on-lunch status to show "Clock Back In" button
      setIsOnLunch(true)
      
      toast({
        title: 'Clocked Out',
        description: `Clocked out at ${roundedTime12}. Click "Clock Back In" to resume.`
      })

      // Reload timesheets to refresh the grid
      await Promise.all([
        loadCurrentTimesheet(),
        loadTimesheets()
      ])
    } catch (error: any) {
      console.error('[Clock Out] Full error:', error)
      console.error('[Clock Out] Error message:', error.message)
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock out. Please check the console for details.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClockBackIn = async () => {
    // Create a NEW timesheet entry for the new clock in cycle
    setIsSubmitting(true)
    
    try {
      // Get current time once at the start
      const now = new Date()
      
      // Get the time value - use editable if available, otherwise use current time
      let timeValue = clockInTimeEditable || clockInTime || ''
      
      let clockInDate: Date
      let roundedTime: string
      
      if (timeValue && timeValue.trim() !== '') {
        // User provided a time
        // Parse and convert 12-hour to 24-hour format
        let time24: string
        try {
          if (timeValue.includes('AM') || timeValue.includes('PM')) {
            time24 = convert12To24Hour(timeValue)
          } else {
            time24 = timeValue
          }
        } catch (e: any) {
          throw new Error(`Invalid time format: ${timeValue}. Please use format like "8:00 AM"`)
        }
        
        // Round the time to nearest 15 minutes
        roundedTime = roundTimeString(time24)
        const [hours, minutes] = roundedTime.split(':').map(Number)
        
        // Create clock in date - use today's date with the specified time
        clockInDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hours,
          minutes,
          0,
          0
        )
      } else {
        // No time provided - use current time rounded to nearest 15 minutes
        roundedTime = roundTimeString(formatTime24Hour(now))
        const [hours, minutes] = roundedTime.split(':').map(Number)
        clockInDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hours,
          minutes,
          0,
          0
        )
      }
      
      // Use selected date or today
      let timesheetDate: Date
      if (selectedDate) {
        const [year, month, day] = selectedDate.split('-').map(Number)
        timesheetDate = new Date(year, month - 1, day, 0, 0, 0, 0)
      } else {
        timesheetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      }

      // Create a NEW timesheet entry (new clock in cycle)
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clockInTime: clockInDate.toISOString(),
          date: timesheetDate.toISOString()
        })
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorMessage = responseData.details || responseData.error || 'Failed to clock in'
        throw new Error(errorMessage)
      }

      // Success - update UI
      const timesheet = responseData
      setCurrentTimesheet(timesheet)
      
      // Convert rounded 24-hour time to 12-hour for display
      const roundedTime12 = convert24To12Hour(roundedTime)
      setClockInTime(roundedTime12)
      setClockInTimeEditable(roundedTime12)
      setIsEditingClockIn(false)
      setClockOutTime('')
      setClockOutTimeEditable('')
      setIsEditingClockOut(false)
      setStatus('clocked-in')
      setIsOnLunch(false)
      
      toast({
        title: 'Clocked Back In',
        description: `New clock in cycle started at ${roundedTime12}`
      })

      // Reload timesheets to refresh the grid
      await Promise.all([
        loadCurrentTimesheet(),
        loadTimesheets()
      ])
    } catch (error: any) {
      console.error('Error clocking back in:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock back in',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJobClockIn = async () => {
    // Create a timesheet if one doesn't exist (for job tracking without clock in)
    if (!currentTimesheet) {
      // Use job tracking date, selected date, or today
      const now = new Date()
      let timesheetDate: Date
      const dateToUse = jobTrackingDate || selectedDate || ''
      if (dateToUse) {
        const [year, month, day] = dateToUse.split('-').map(Number)
        timesheetDate = new Date(year, month - 1, day, 0, 0, 0, 0)
      } else {
        timesheetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      }
      
      // Create a minimal timesheet for job tracking (default to 8 AM clock in)
      const defaultClockIn = new Date(timesheetDate)
      defaultClockIn.setHours(8, 0, 0, 0)
      
      try {
        const response = await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clockInTime: defaultClockIn.toISOString(),
            date: timesheetDate.toISOString()
          })
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create timesheet for job tracking')
        }
        
        const newTimesheet = await response.json()
        setCurrentTimesheet(newTimesheet)
        await loadTimesheets()
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create timesheet for job tracking',
          variant: 'destructive'
        })
        return
      }
    }

    if (!selectedJobId || !selectedLaborCodeId) {
      toast({
        title: 'Error',
        description: 'Please select Job # and Labor Code',
        variant: 'destructive'
      })
      return
    }

    // Get the time value - use editable if available, otherwise use display value, or auto-fill with current time
    let timeValue = jobPunchInTimeEditable || jobPunchInTime || ''
    
    // Auto-fill with current time if not set
    if (!timeValue || timeValue.trim() === '') {
      const now = new Date()
      const rounded = roundToNearest15Minutes(now)
      timeValue = formatTime12Hour(rounded)
      setJobPunchInTimeEditable(timeValue)
      setJobPunchInTime(timeValue)
    }

    setIsSubmitting(true)
    try {
      const selectedJob = jobs.find(j => j.id === selectedJobId)
      const selectedLaborCode = laborCodes.find(lc => lc.id === selectedLaborCodeId)
      
      if (!selectedJob || !selectedLaborCode) {
        throw new Error('Selected job or labor code not found')
      }

      // Parse and convert 12-hour to 24-hour format
      let time24: string
      try {
        if (timeValue.includes('AM') || timeValue.includes('PM')) {
          time24 = convert12To24Hour(timeValue)
        } else {
          // Assume it's already 24-hour format
          time24 = timeValue
        }
      } catch (e: any) {
        throw new Error(`Invalid time format: ${timeValue}. Please use format like "8:00 AM"`)
      }
      
      // Round the time to nearest 15 minutes
      const roundedTime = roundTimeString(time24)
      const [hours, minutes] = roundedTime.split(':').map(Number)
      
      // Create punch in date - use job tracking date, selected date, or today's date with the specified time
      const now = new Date()
      const dateToUse = jobTrackingDate || selectedDate || ''
      let punchInDate: Date
      
      if (dateToUse) {
        const [year, month, day] = dateToUse.split('-').map(Number)
        punchInDate = new Date(year, month - 1, day, hours, minutes, 0, 0)
      } else {
        // Use timesheet date if available, otherwise today
        if (currentTimesheet) {
          const tsDate = new Date(currentTimesheet.date)
          punchInDate = new Date(
            tsDate.getFullYear(),
            tsDate.getMonth(),
            tsDate.getDate(),
            hours,
            minutes,
            0,
            0
          )
        } else {
          punchInDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0
      )
        }
      }

      if (!currentTimesheet) {
        toast({
          title: 'Error',
          description: 'No active timesheet found',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch(`/api/timesheets/${currentTimesheet.id}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobNumber: selectedJob.jobNumber,
          laborCode: selectedLaborCode.code,
          punchInTime: punchInDate.toISOString(),
          notes: notes || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start job')
      }

      const jobEntry = await response.json()
      setActiveJobEntry(jobEntry)
      
      // Convert rounded 24-hour time to 12-hour for display
      const roundedTime12 = convert24To12Hour(roundedTime)
      setJobPunchInTime(roundedTime12)
      setJobPunchInTimeEditable(roundedTime12)
      
      // Clear selections after starting job (but keep time for next job)
      setSelectedJobId('')
      setSelectedLaborCodeId('')
      setNotes('')
      
      toast({
        title: 'Success',
        description: `Job ${selectedJob.jobNumber} started at ${roundedTime12}. Previous job auto-clocked out.`
      })

      // Reload current timesheet and all timesheets to get updated job entries
      await Promise.all([
        loadCurrentTimesheet(),
        loadTimesheets()
      ])
    } catch (error: any) {
      console.error('Error starting job:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to start job',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJobClockOut = async () => {
    if (!activeJobEntry) return

    // Get the time value - use editable if available, otherwise use display value, or auto-fill with current time
    let timeValue = jobPunchOutTimeEditable || jobPunchOutTime || ''
    
    // Auto-fill with current time if not set
    if (!timeValue || timeValue.trim() === '') {
      const now = new Date()
      const rounded = roundToNearest15Minutes(now)
      timeValue = formatTime12Hour(rounded)
      setJobPunchOutTimeEditable(timeValue)
      setJobPunchOutTime(timeValue)
    }

    setIsSubmitting(true)
    try {
      // Parse and convert 12-hour to 24-hour format
      let time24: string
      try {
        if (timeValue.includes('AM') || timeValue.includes('PM')) {
          time24 = convert12To24Hour(timeValue)
        } else {
          // Assume it's already 24-hour format
          time24 = timeValue
        }
      } catch (e: any) {
        throw new Error(`Invalid time format: ${timeValue}. Please use format like "8:00 AM"`)
      }
      
      // Round the time to nearest 15 minutes
      const roundedTime = roundTimeString(time24)
      const [hours, minutes] = roundedTime.split(':').map(Number)
      
      // Create punch out date - use timesheet date or today's date with the specified time
      const now = new Date()
      let punchOutDate: Date
      
      if (currentTimesheet) {
        const tsDate = new Date(currentTimesheet.date)
        punchOutDate = new Date(
          tsDate.getFullYear(),
          tsDate.getMonth(),
          tsDate.getDate(),
          hours,
          minutes,
          0,
          0
        )
      } else {
        punchOutDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0
      )
      }

      const response = await fetch(`/api/jobs/${activeJobEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          punchOutTime: punchOutDate.toISOString(),
          notes: notes || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to clock out of job')
      }

      // Calculate job duration for toast message
      const jobDuration = calculateHoursBetween(
        new Date(activeJobEntry.punchInTime),
        punchOutDate
      )
      
      // Convert rounded 24-hour time to 12-hour for display
      const roundedTime12 = convert24To12Hour(roundedTime)
      setJobPunchOutTime(roundedTime12)
      setJobPunchOutTimeEditable(roundedTime12)
      
      setActiveJobEntry(null)
      setSelectedJobId('')
      setSelectedLaborCodeId('')
      setNotes('')
      setJobPunchOutTime('')
      setJobPunchOutTimeEditable('')
      
      toast({
        title: 'Success',
        description: `Job clocked out at ${roundedTime12}. Duration: ${jobDuration.toFixed(2)} hours`
      })

      // Reload current timesheet and all timesheets to get updated job entries
      await Promise.all([
        loadCurrentTimesheet(),
        loadTimesheets()
      ])
    } catch (error: any) {
      console.error('Error clocking out of job:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock out of job',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Inline editing handlers
  const startEditing = (timesheetId: string | null, jobId: string | null, field: string, currentValue: string) => {
    setEditingTimesheetId(timesheetId)
    setEditingJobId(jobId)
    setEditingField(field)
    setEditingValue(currentValue)
  }

  const cancelEditing = () => {
    setEditingTimesheetId(null)
    setEditingJobId(null)
    setEditingField(null)
    setEditingValue('')
  }

  const saveTimesheetEdit = async (timesheetId: string, field: 'clockInTime' | 'clockOutTime', timeValue: string) => {
    if (!timeValue) {
      toast({
        title: 'Error',
        description: 'Time cannot be empty',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Parse and round the time
      const [hours, minutes] = timeValue.split(':').map(Number)
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Invalid time format. Use HH:MM')
      }

      const timeDate = new Date()
      timeDate.setHours(hours, minutes, 0, 0)
      const roundedTime = roundTimeString(formatTime24Hour(timeDate))
      const [roundedHours, roundedMinutes] = roundedTime.split(':').map(Number)
      timeDate.setHours(roundedHours, roundedMinutes, 0, 0)

      const updateData: any = {}
      if (field === 'clockInTime') {
        updateData.clockInTime = timeDate.toISOString()
      } else {
        updateData.clockOutTime = timeDate.toISOString()
      }

      const response = await fetch(`/api/timesheets/${timesheetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update timesheet')
      }

      // Optimistic update
      setTimesheetEntries(prev => prev.map(ts => {
        if (ts.id === timesheetId) {
          const updated = { ...ts }
          if (field === 'clockInTime') {
            updated.clockInTime = timeDate.toISOString()
          } else {
            updated.clockOutTime = timeDate.toISOString()
          }
          if (updated.clockOutTime && updated.clockInTime) {
            updated.totalHours = calculateHoursBetween(new Date(updated.clockInTime), new Date(updated.clockOutTime))
          }
          return updated
        }
        return ts
      }))

      toast({
        title: 'Success',
        description: 'Timesheet updated successfully'
      })

      // Reload to get server-calculated values
      await loadTimesheets()
      cancelEditing()
    } catch (error: any) {
      console.error('Error updating timesheet:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update timesheet',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTimesheet = async (timesheetId: string) => {
    if (!confirm('Are you sure you want to delete this timesheet entry? This action cannot be undone.')) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete timesheet')
      }

      // Remove from local state
      setTimesheetEntries(prev => prev.filter(ts => ts.id !== timesheetId))
      
      // If this was the current timesheet, clear it
      if (currentTimesheet?.id === timesheetId) {
        setCurrentTimesheet(null)
        setStatus('idle')
        setClockInTime('')
        setClockOutTime('')
        setTotalHours(0)
      }

      toast({
        title: 'Success',
        description: 'Timesheet deleted successfully'
      })

      // Reload timesheets
      await loadTimesheets()
    } catch (error: any) {
      console.error('Error deleting timesheet:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete timesheet',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const saveJobEdit = async (jobId: string, field: 'punchInTime' | 'punchOutTime' | 'notes', value: string) => {
    setIsSubmitting(true)
    try {
      const updateData: any = {}

      if (field === 'notes') {
        updateData.notes = value || null
      } else {
        // Parse and round the time
        const [hours, minutes] = value.split(':').map(Number)
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          throw new Error('Invalid time format. Use HH:MM')
        }

        const timeDate = new Date()
        timeDate.setHours(hours, minutes, 0, 0)
        const roundedTime = roundTimeString(formatTime24Hour(timeDate))
        const [roundedHours, roundedMinutes] = roundedTime.split(':').map(Number)
        timeDate.setHours(roundedHours, roundedMinutes, 0, 0)

        if (field === 'punchInTime') {
          updateData.punchInTime = timeDate.toISOString()
        } else {
          updateData.punchOutTime = timeDate.toISOString()
        }
      }

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update job entry')
      }

      // Optimistic update
      setTimesheetEntries(prev => prev.map(ts => {
        const updated = { ...ts }
        updated.jobEntries = ts.jobEntries.map(je => {
          if (je.id === jobId) {
            const jobUpdated = { ...je }
            if (field === 'notes') {
              jobUpdated.notes = value || null
            } else if (field === 'punchInTime') {
              const [h, m] = value.split(':').map(Number)
              const d = new Date()
              d.setHours(h, m, 0, 0)
              jobUpdated.punchInTime = d.toISOString()
            } else if (field === 'punchOutTime') {
              const [h, m] = value.split(':').map(Number)
              const d = new Date()
              d.setHours(h, m, 0, 0)
              jobUpdated.punchOutTime = d.toISOString()
            }
            return jobUpdated
          }
          return je
        })
        return updated
      }))

      toast({
        title: 'Success',
        description: 'Job entry updated successfully'
      })

      // Reload to get server-calculated values
      await loadTimesheets()
      if (currentTimesheet) {
        await loadCurrentTimesheet()
      }
      cancelEditing()
    } catch (error: any) {
      console.error('Error updating job entry:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update job entry',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get all job entries for current timesheet to display in spreadsheet
  const currentJobEntries = currentTimesheet?.jobEntries || []

  return (
    <div className="space-y-6">
      {/* Global Date Selector - Prominent at top */}
      <Card className="border-blue-300 shadow-md bg-gradient-to-r from-blue-50 to-blue-100">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-700" />
                <Label className="text-base font-semibold text-blue-900">Date (Affects Clock In & Job Tracking)</Label>
              </div>
              <Input 
                type="date"
                value={selectedDate || jobTrackingDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const dateValue = e.target.value
                  setSelectedDate(dateValue)
                  setJobTrackingDate(dateValue)
                }}
                className="bg-white border-2 border-blue-300 text-base font-medium min-w-[180px]"
                disabled={status === 'clocked-in'}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0]
                  setSelectedDate(today)
                  setJobTrackingDate(today)
                }}
                className="bg-white"
              >
                Today
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{userName}</span>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Clock In/Out Widgets - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Clock In Widget */}
        <Card className="border-green-200 shadow-sm">
          <CardHeader className="bg-green-50 border-b border-green-100">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <LogIn className="h-5 w-5" />
              Clock In
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Time</Label>
              <div className="flex items-center gap-2">
                <TimePicker
                  value={isEditingClockIn ? clockInTimeEditable : clockInTime || ''}
                  onChange={(time12) => {
                    setClockInTimeEditable(time12)
                    setIsEditingClockIn(true)
                  }}
                  disabled={status === 'clocked-in'}
                  className="flex-1"
                />
                {(status === 'idle' || status === 'on-lunch') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      const time12 = formatTime12Hour(rounded)
                      setClockInTimeEditable(time12)
                      setIsEditingClockIn(true)
                    }}
                    title="Fill current time (rounded to nearest 15 min)"
                  >
                    Now
                  </Button>
                )}
              </div>
            </div>
              {status === 'idle' && (
                <Button
                  onClick={handleClockIn}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Clock In
                    </>
                  )}
                </Button>
              )}
              {status === 'on-lunch' && (
                <Button
                  onClick={handleClockBackIn}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Clock Back In
                    </>
                  )}
                </Button>
              )}
              {status === 'clocked-in' && clockInTime && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-gray-600">Clocked in at</div>
                  <div className="text-xl font-bold text-green-700">{clockInTime}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clock Out Widget */}
        <Card className="border-red-200 shadow-sm">
          <CardHeader className="bg-red-50 border-b border-red-100">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <LogOut className="h-5 w-5" />
              Clock Out
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Time</Label>
              <div className="flex items-center gap-2">
                <TimePicker
                  value={isEditingClockOut ? clockOutTimeEditable : clockOutTime || ''}
                  onChange={(time12) => {
                    if (clockInTime || clockInTimeEditable) {
                      const clockInTimeValue = clockInTimeEditable || clockInTime
                      if (clockInTimeValue) {
                        try {
                          const clockIn24 = convert12To24Hour(clockInTimeValue)
                          const clockOut24 = convert12To24Hour(time12)
                          const [inHours, inMinutes] = clockIn24.split(':').map(Number)
                          const [outHours, outMinutes] = clockOut24.split(':').map(Number)
                          const inTotalMinutes = inHours * 60 + inMinutes
                          const outTotalMinutes = outHours * 60 + outMinutes
                          if (outTotalMinutes <= inTotalMinutes) {
                            toast({
                              title: 'Invalid Time',
                              description: `Clock out time must be after clock in time (${clockInTimeValue})`,
                              variant: 'destructive'
                            })
                            return
                          }
                        } catch (e) {
                            // Continue
                        }
                      }
                    }
                    setClockOutTimeEditable(time12)
                    setIsEditingClockOut(true)
                  }}
                  disabled={status === 'idle' || status === 'clocked-out'}
                  className="flex-1"
                />
                {status === 'clocked-in' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      const time12 = formatTime12Hour(rounded)
                      if (clockInTime || clockInTimeEditable) {
                        const clockInTimeValue = clockInTimeEditable || clockInTime
                        if (clockInTimeValue) {
                          try {
                            const clockIn24 = convert12To24Hour(clockInTimeValue)
                            const clockOut24 = convert12To24Hour(time12)
                            const [inHours, inMinutes] = clockIn24.split(':').map(Number)
                            const [outHours, outMinutes] = clockOut24.split(':').map(Number)
                            const inTotalMinutes = inHours * 60 + inMinutes
                            const outTotalMinutes = outHours * 60 + outMinutes
                            if (outTotalMinutes <= inTotalMinutes) {
                              toast({
                                title: 'Invalid Time',
                                description: `Current time is not after clock in time. Please select a later time.`,
                                variant: 'destructive'
                              })
                              return
                            }
                          } catch (e) {
                              // Continue
                          }
                        }
                      }
                      setClockOutTimeEditable(time12)
                      setIsEditingClockOut(true)
                    }}
                    title="Fill current time (rounded to nearest 15 min)"
                  >
                    Now
                  </Button>
                )}
              </div>
            </div>
                  {status === 'clocked-in' && (
                    <Button
                      onClick={handleClockOut}
                      disabled={isSubmitting}
                      variant="destructive"
                  className="w-full"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-2" />
                          Clock Out
                        </>
                      )}
                    </Button>
                  )}
              {status === 'clocked-out' && clockOutTime && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-gray-600">Clocked out at</div>
                  <div className="text-xl font-bold text-red-700">{clockOutTime}</div>
                </div>
              )}
              {status === 'clocked-in' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-gray-600">Total Hours</div>
                  <div className="text-2xl font-bold text-blue-600">{totalHours.toFixed(2)}h</div>
                  <div className="text-xs text-gray-500 mt-1">Status: <span className="font-medium text-green-700">Active</span></div>
            </div>
              )}
              {status === 'clocked-out' && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-sm text-gray-600">Total Hours</div>
                  <div className="text-2xl font-bold text-gray-700">{totalHours.toFixed(2)}h</div>
                  <div className="text-xs text-gray-500 mt-1">Status: <span className="font-medium text-gray-700">Completed</span></div>
                </div>
              )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Job Tracking Spreadsheet */}
      <Card className="border-blue-200 shadow-sm">
        <CardHeader className="bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <FileText className="h-5 w-5" />
              Job Time Tracking
          </CardTitle>
            <div className="text-sm text-gray-600">
              {currentTimesheet && (
                <span>Timesheet: <span className="font-medium">{formatTime12Hour(new Date(currentTimesheet.clockInTime))} - {currentTimesheet.clockOutTime ? formatTime12Hour(new Date(currentTimesheet.clockOutTime)) : 'Active'}</span></span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Input Form for New Entry */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Add New Job Entry</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Start Time</Label>
                <div className="flex items-center gap-2">
                  <TimePicker
                    value={jobPunchInTimeEditable || jobPunchInTime || ''}
                    onChange={(time12) => {
                      setJobPunchInTimeEditable(time12)
                      setJobPunchInTime(time12)
                    }}
                    disabled={isLoading || !!activeJobEntry}
                    className="flex-1"
                    placeholder="Select time..."
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      const rounded12 = formatTime12Hour(rounded)
                      setJobPunchInTimeEditable(rounded12)
                      setJobPunchInTime(rounded12)
                    }}
                    disabled={isLoading || !!activeJobEntry}
                    className="min-h-[40px]"
                    title="Fill current time (rounded to nearest 15 min)"
                  >
                    Now
                  </Button>
          </div>
              </div>
            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Job Number</Label>
              <SearchableSelect
                options={jobs.map(job => ({
                  value: job.id,
                  label: `${job.jobNumber} - ${job.title}`,
                  searchText: `${job.jobNumber} ${job.title}`
                }))}
                value={selectedJobId}
                onValueChange={setSelectedJobId}
                placeholder="Search or select job..."
                disabled={isLoading || !!activeJobEntry}
                emptyMessage="No jobs found"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Phase Code</Label>
              <Select value={selectedLaborCodeId} onValueChange={setSelectedLaborCodeId} disabled={isLoading || !!activeJobEntry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Labor Code" />
                </SelectTrigger>
                <SelectContent>
                  {laborCodes.map((code) => (
                    <SelectItem key={code.id} value={code.id}>
                      {code.code} - {code.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Note</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  disabled={isLoading || !!activeJobEntry}
                />
              </div>
              <div className="space-y-2 flex items-end">
                <Button
                  onClick={handleJobClockIn}
                  disabled={!!activeJobEntry || !selectedJobId || !selectedLaborCodeId || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Job
                    </>
                  )}
                </Button>
              </div>
            </div>
            {activeJobEntry && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-800">
                      Active: {activeJobEntry.jobNumber} - {activeJobEntry.laborCode}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Started: {formatTime12Hour(new Date(activeJobEntry.punchInTime))}
                      {(() => {
                        const startTime = new Date(activeJobEntry.punchInTime)
                        const now = new Date()
                        const duration = calculateHoursBetween(startTime, now)
                        return <span> • Duration: {duration.toFixed(2)}h</span>
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
              <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-700">End Time</Label>
                <div className="flex items-center gap-2">
                  <TimePicker
                    value={jobPunchOutTimeEditable || jobPunchOutTime || ''}
                    onChange={(time12) => {
                      setJobPunchOutTimeEditable(time12)
                      setJobPunchOutTime(time12)
                    }}
                    disabled={isLoading || isSubmitting}
                          className="w-32"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      const rounded12 = formatTime12Hour(rounded)
                      setJobPunchOutTimeEditable(rounded12)
                      setJobPunchOutTime(rounded12)
                    }}
                    disabled={isLoading || isSubmitting}
                  >
                    Now
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleJobClockOut}
                      disabled={!activeJobEntry || isSubmitting}
                variant="outline"
                      className="min-h-[44px]"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                          End Job
                  </>
                )}
              </Button>
            </div>
          </div>
              </div>
            )}
          </div>

          {/* Spreadsheet Table */}
          {currentJobEntries.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50">
                    <TableHead className="font-semibold text-blue-900">Start Time</TableHead>
                    <TableHead className="font-semibold text-blue-900">End Time</TableHead>
                    <TableHead className="font-semibold text-blue-900">Job Number</TableHead>
                    <TableHead className="font-semibold text-blue-900">Phase Code</TableHead>
                    <TableHead className="font-semibold text-blue-900 bg-gray-100">Duration</TableHead>
                    <TableHead className="font-semibold text-blue-900">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentJobEntries.map((jobEntry) => {
                    const jobPunchInStr = formatTime12Hour(new Date(jobEntry.punchInTime))
                    const jobPunchOutStr = jobEntry.punchOutTime
                      ? formatTime12Hour(new Date(jobEntry.punchOutTime))
                      : '-'
                    const jobDuration = calculateJobTotal(jobEntry)
                    const isEditingJob = editingJobId === jobEntry.id
                    const jobPunchIn24 = formatTime24Hour(new Date(jobEntry.punchInTime))
                    const jobPunchOut24 = jobEntry.punchOutTime ? formatTime24Hour(new Date(jobEntry.punchOutTime)) : ''
                    const isActive = !jobEntry.punchOutTime
                    
                    return (
                      <TableRow 
                        key={jobEntry.id}
                        className={isActive ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}
                      >
                        <TableCell>
                          {isEditingJob && editingField === 'punchInTime' ? (
                            <Input
                              type="time"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="w-24 h-8 text-xs"
                              onBlur={() => saveJobEdit(jobEntry.id, 'punchInTime', editingValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveJobEdit(jobEntry.id, 'punchInTime', editingValue)
                                if (e.key === 'Escape') cancelEditing()
                              }}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-blue-600 font-medium"
                              onClick={() => startEditing(null, jobEntry.id, 'punchInTime', jobPunchIn24)}
                              title="Click to edit"
                            >
                              {jobPunchInStr}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditingJob && editingField === 'punchOutTime' ? (
                            <Input
                              type="time"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="w-24 h-8 text-xs"
                              onBlur={() => saveJobEdit(jobEntry.id, 'punchOutTime', editingValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveJobEdit(jobEntry.id, 'punchOutTime', editingValue)
                                if (e.key === 'Escape') cancelEditing()
                              }}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-blue-600 font-medium"
                              onClick={() => startEditing(null, jobEntry.id, 'punchOutTime', jobPunchOut24 || formatTime24Hour(new Date()))}
                              title="Click to edit"
                            >
                              {jobPunchOutStr}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{jobEntry.jobNumber}</TableCell>
                        <TableCell>{jobEntry.laborCode}</TableCell>
                        <TableCell className="bg-gray-50 font-semibold text-blue-600">
                          {jobDuration.toFixed(2)}h
                        </TableCell>
                        <TableCell>
                          {isEditingJob && editingField === 'notes' ? (
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="w-full h-8 text-xs"
                              onBlur={() => saveJobEdit(jobEntry.id, 'notes', editingValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveJobEdit(jobEntry.id, 'notes', editingValue)
                                if (e.key === 'Escape') cancelEditing()
                              }}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-blue-600 text-sm"
                              onClick={() => startEditing(null, jobEntry.id, 'notes', jobEntry.notes || '')}
                              title="Click to edit"
                            >
                              {jobEntry.notes || '-'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {currentJobEntries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No job entries yet. Add your first entry above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Calendar View */}
      <Card className="border-blue-200 shadow-sm">
        <CardHeader className="bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Calendar className="h-5 w-5" />
              Weekly Timesheet Calendar
            </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              <div className="text-sm font-medium text-gray-700 px-3 py-1.5 bg-white border border-gray-300 rounded-md min-w-[200px] text-center">
                {getWeekRangeString()}
              </div>
                <Button
                  variant="outline"
                  size="sm"
                onClick={() => navigateWeek('next')}
                  disabled={isSubmitting}
                >
                <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                onClick={goToCurrentWeek}
                  disabled={isSubmitting}
                >
                Today
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                Week Total: <span className="font-bold text-blue-600">{calculateOverallTotal().toFixed(2)}h</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center text-gray-500 py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading timesheets...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {getWeekDays().map((day, idx) => {
                    const isToday = day.toDateString() === new Date().toDateString()
                    const dayName = day.toLocaleDateString('en-US', { weekday: 'short' })
                    const dayNum = day.getDate()
                    const month = day.toLocaleDateString('en-US', { month: 'short' })
                    
                    return (
                      <div
                        key={idx}
                        className={`p-2 text-center border-b-2 ${
                          isToday ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="text-xs font-semibold text-gray-600 uppercase">{dayName}</div>
                        <div className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                          {dayNum}
                        </div>
                        <div className="text-xs text-gray-500">{month}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Calendar Body - Timesheet Entries */}
                <div className="grid grid-cols-7 gap-2">
                  {getWeekDays().map((day, dayIdx) => {
                    const dayTimesheets = getTimesheetsForDate(day)
                    const dayTotal = dayTimesheets.reduce((sum, ts) => sum + calculateDailyTotal(ts), 0)
                    const isToday = day.toDateString() === new Date().toDateString()
                    
                    return (
                      <div
                        key={dayIdx}
                        className={`min-h-[400px] border-2 rounded-lg p-2 ${
                          isToday ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="space-y-2">
                          {dayTimesheets.length === 0 ? (
                            <div className="text-xs text-gray-400 text-center py-4">
                              No entries
                            </div>
                          ) : (
                            dayTimesheets.map((timesheet) => {
                              const clockInStr = formatTime12Hour(new Date(timesheet.clockInTime))
                              const clockOutStr = timesheet.clockOutTime 
                                ? formatTime12Hour(new Date(timesheet.clockOutTime))
                                : '-'
                              const dailyTotal = calculateDailyTotal(timesheet)
                              const isEditingTimesheet = editingTimesheetId === timesheet.id && !editingJobId
                              
                              return (
                                <div
                                  key={timesheet.id}
                                  className="bg-white border border-blue-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start justify-between gap-1 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-semibold text-blue-700 mb-1">
                                        Clock In/Out
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-xs">
                                          <span className="text-gray-600">In: </span>
                                          {isEditingTimesheet && editingField === 'clockInTime' ? (
                                            <Input
                                              type="time"
                                              value={editingValue}
                                              onChange={(e) => setEditingValue(e.target.value)}
                                              className="w-20 h-6 text-xs"
                                              onBlur={() => saveTimesheetEdit(timesheet.id, 'clockInTime', editingValue)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveTimesheetEdit(timesheet.id, 'clockInTime', editingValue)
                                                if (e.key === 'Escape') cancelEditing()
                                              }}
                                              autoFocus
                                            />
                                          ) : (
                                            <span
                                              className="cursor-pointer hover:text-blue-600 font-medium"
                                              onClick={() => startEditing(timesheet.id, null, 'clockInTime', formatTime24Hour(new Date(timesheet.clockInTime)))}
                                              title="Click to edit"
                                            >
                                              {clockInStr}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs">
                                          <span className="text-gray-600">Out: </span>
                                          {isEditingTimesheet && editingField === 'clockOutTime' ? (
                                            <Input
                                              type="time"
                                              value={editingValue}
                                              onChange={(e) => setEditingValue(e.target.value)}
                                              className="w-20 h-6 text-xs"
                                              onBlur={() => saveTimesheetEdit(timesheet.id, 'clockOutTime', editingValue)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveTimesheetEdit(timesheet.id, 'clockOutTime', editingValue)
                                                if (e.key === 'Escape') cancelEditing()
                                              }}
                                              autoFocus
                                            />
                                          ) : (
                                            <span
                                              className="cursor-pointer hover:text-blue-600 font-medium"
                                              onClick={() => startEditing(timesheet.id, null, 'clockOutTime', timesheet.clockOutTime ? formatTime24Hour(new Date(timesheet.clockOutTime)) : '')}
                                              title="Click to edit"
                                            >
                                              {clockOutStr}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs font-semibold text-blue-600 mt-1">
                                          {dailyTotal.toFixed(2)}h
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteTimesheet(timesheet.id)}
                                      disabled={isSubmitting}
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title="Delete timesheet"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  
                                  {/* Job Entries */}
                                  {timesheet.jobEntries.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <div className="text-xs font-semibold text-gray-600 mb-1">Jobs:</div>
                                      <div className="space-y-1">
                                        {timesheet.jobEntries.map((jobEntry) => {
                                          const jobPunchInStr = formatTime12Hour(new Date(jobEntry.punchInTime))
                                          const jobPunchOutStr = jobEntry.punchOutTime
                                            ? formatTime12Hour(new Date(jobEntry.punchOutTime))
                                            : '-'
                                          const jobDuration = calculateJobTotal(jobEntry)
                                          const isEditingJob = editingJobId === jobEntry.id
                                          const jobPunchIn24 = formatTime24Hour(new Date(jobEntry.punchInTime))
                                          const jobPunchOut24 = jobEntry.punchOutTime ? formatTime24Hour(new Date(jobEntry.punchOutTime)) : ''
                                          
                                          return (
                                            <div
                                              key={jobEntry.id}
                                              className={`text-xs p-1 rounded ${
                                                !jobEntry.punchOutTime ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                                              }`}
                                            >
                                              <div className="font-medium text-gray-800">
                                                {jobEntry.jobNumber} - {jobEntry.laborCode}
                                              </div>
                                              <div className="text-gray-600 flex items-center gap-1 flex-wrap">
                                                {isEditingJob && editingField === 'punchInTime' ? (
                                                  <Input
                                                    type="time"
                                                    value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    className="w-16 h-5 text-xs"
                                                    onBlur={() => saveJobEdit(jobEntry.id, 'punchInTime', editingValue)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveJobEdit(jobEntry.id, 'punchInTime', editingValue)
                                                      if (e.key === 'Escape') cancelEditing()
                                                    }}
                                                    autoFocus
                                                  />
                                                ) : (
                                                  <span
                                                    className="cursor-pointer hover:text-blue-600"
                                                    onClick={() => startEditing(null, jobEntry.id, 'punchInTime', jobPunchIn24)}
                                                    title="Click to edit"
                                                  >
                                                    {jobPunchInStr}
                                                  </span>
                                                )}
                                                <span>-</span>
                                                {isEditingJob && editingField === 'punchOutTime' ? (
                                                  <Input
                                                    type="time"
                                                    value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    className="w-16 h-5 text-xs"
                                                    onBlur={() => saveJobEdit(jobEntry.id, 'punchOutTime', editingValue)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveJobEdit(jobEntry.id, 'punchOutTime', editingValue)
                                                      if (e.key === 'Escape') cancelEditing()
                                                    }}
                                                    autoFocus
                                                  />
                                                ) : (
                                                  <span
                                                    className="cursor-pointer hover:text-blue-600"
                                                    onClick={() => startEditing(null, jobEntry.id, 'punchOutTime', jobPunchOut24 || formatTime24Hour(new Date()))}
                                                    title="Click to edit"
                                                  >
                                                    {jobPunchOutStr}
                                                  </span>
                                                )}
                                                <span className="text-blue-600 font-medium">
                                                  ({jobDuration.toFixed(2)}h)
                                                </span>
                                              </div>
                                              {jobEntry.notes && (
                                                <div className="text-xs text-gray-500 mt-0.5 italic">
                                                  {jobEntry.notes}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                        
                        {/* Day Total */}
                        {dayTotal > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-300">
                            <div className="text-xs font-bold text-blue-700 text-center">
                              Day: {dayTotal.toFixed(2)}h
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


