'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, Send, Loader2, AlertCircle, X } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isSameMonth, addDays, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { getWeekBoundariesUTC } from '@/lib/utils/date-utils'
import { TimeEntryModal } from './time-entry-modal'
import { DayTimesheetModal } from './day-timesheet-modal'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface User {
  id: string
  name: string | null
  email: string | null
}

interface TimesheetEntry {
  id: string
  userId: string
  date: string
  clockInTime: string
  clockOutTime: string | null
  totalHours: number | null
  status: string
  jobEntries: any[]
  submissionStatus?: string
  submissionId?: string | null
  isLocked?: boolean
  isRejected?: boolean
  rejectionReason?: string | null
}

interface AttendanceViewProps {
  currentUserId: string
  currentUserName: string
  users: User[]
  isAdmin: boolean
}

export function AttendanceView({
  currentUserId,
  currentUserName,
  users,
  isAdmin
}: AttendanceViewProps) {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  // Single source of truth for the currently displayed day
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfDay(new Date()))
  // The date passed into the TimeEntryModal when opened
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [weekSubmissionStatus, setWeekSubmissionStatus] = useState<string | null>(null)
  const [weekSubmissionId, setWeekSubmissionId] = useState<string | null>(null)
  const [weekRejectionReason, setWeekRejectionReason] = useState<string | null>(null)
  // Store submission status per week (weekStart -> status)
  const [submissionStatusCache, setSubmissionStatusCache] = useState<Map<string, { status: string | null, id: string | null, rejectionReason?: string | null }>>(new Map())
  // Store the date to use for the modal - set before opening
  const [modalDate, setModalDate] = useState<Date | null>(null)
  // Rejected change requests notifications
  const [rejectedChangeRequests, setRejectedChangeRequests] = useState<Array<{
    id: string
    date: string
    rejectionReason: string | null
    requestedClockInTime: string
    requestedClockOutTime: string | null
  }>>([])
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set())
  // Weekly submission rejection notifications (array like change requests)
  const [rejectedWeeklySubmissions, setRejectedWeeklySubmissions] = useState<Array<{
    id: string
    weekStart: string
    weekEnd: string
    rejectionReason: string | null
    rejectedAt: string | null
  }>>([])
  // Track dismissals by submissionId + rejectedAt timestamp to handle re-rejections
  const [dismissedWeeklyRejections, setDismissedWeeklyRejections] = useState<Set<string>>(new Set())
  
  // Ref to always get the latest currentDate value
  const currentDateRef = useRef(currentDate)
  useEffect(() => {
    currentDateRef.current = currentDate
  }, [currentDate])

  // Stable getter — always returns the latest currentDate
  const getCurrentDate = useCallback(() => currentDateRef.current, [])

  // Load timesheets - only clock in/out entries (no job entries)
  const loadTimesheets = useCallback(async () => {
    setIsLoading(true)
    try {
      let startDate: Date
      let endDate: Date
      
      if (viewMode === 'day') {
        startDate = new Date(currentDate)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(currentDate)
        endDate.setHours(23, 59, 59, 999)
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 0 })
        endDate = endOfWeek(currentDate, { weekStartsOn: 0 })
      } else {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      }

      const response = await fetch(
        `/api/timesheets?userId=${selectedUserId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      
      if (response.ok) {
        const data = await response.json()
        // Ensure we have an array - handle both array and object responses
        const timesheetsData = Array.isArray(data) ? data : (data.data || data.timesheets || [])
        // Filter to only show clock in/out entries (entries with no job entries)
        const attendanceEntries = Array.isArray(timesheetsData) 
          ? timesheetsData.filter((ts: TimesheetEntry) => ts.jobEntries && Array.isArray(ts.jobEntries) && ts.jobEntries.length === 0)
          : []
        setTimesheets(attendanceEntries)
        
        // Check submission status for the current week (if in week view)
        // IMPORTANT: Only check status for entries belonging to the selected user
        // Always check submission status in week view, and preserve it when switching views
        // ALWAYS check API first to ensure we have the latest status (especially after page reload)
        if (viewMode === 'week') {
          const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
          const weekKey = `${selectedUserId}-${weekStart.toISOString()}`
          
          // Always check API first (don't rely on cache on initial load)
          // Cache is only used for immediate UI updates, but API is source of truth
          const shouldUseCache = submissionStatusCache.size > 0
          
          if (shouldUseCache) {
            const cachedStatus = submissionStatusCache.get(weekKey)
            if (cachedStatus) {
              setWeekSubmissionStatus(cachedStatus.status)
              setWeekSubmissionId(cachedStatus.id)
            }
          }
          
          // Always check API to ensure we have the latest status
          // This is especially important after page reload when cache is empty
          // Normalize weekStart to UTC start of day for API query
          const weekStartUTC = new Date(Date.UTC(
            weekStart.getUTCFullYear(),
            weekStart.getUTCMonth(),
            weekStart.getUTCDate(),
            0, 0, 0, 0
          ))
          try {
            const submissionResponse = await fetch(
              `/api/timesheet-submissions?userId=${selectedUserId}&weekStart=${weekStartUTC.toISOString()}`
            )
            if (submissionResponse.ok) {
              const submissionData = await submissionResponse.json()
              const submissions = Array.isArray(submissionData) ? submissionData : (submissionData.data || [])
              
              // Find submission for this week (attendance entries only - those without jobId)
              const weekSubmission = submissions.find((sub: any) => {
                const subWeekStart = new Date(sub.weekStart)
                const subWeekStartUTC = new Date(Date.UTC(
                  subWeekStart.getUTCFullYear(),
                  subWeekStart.getUTCMonth(),
                  subWeekStart.getUTCDate(),
                  0, 0, 0, 0
                ))
                const hasJobEntries = sub.timeEntries && Array.isArray(sub.timeEntries) && 
                                     sub.timeEntries.some((te: any) => te.jobId)
                return subWeekStartUTC.getTime() === weekStartUTC.getTime() && !hasJobEntries
              })
              if (weekSubmission) {
                const status = weekSubmission.status || null
                const id = weekSubmission.id || null
                const rejectionReason = weekSubmission.rejectionReason || null
                setWeekSubmissionStatus(status)
                setWeekSubmissionId(id)
                setWeekRejectionReason(rejectionReason)
                // Always update cache with API result (source of truth)
                setSubmissionStatusCache(prev => new Map(prev).set(weekKey, { status, id, rejectionReason }))
              } else {
                // Also check entries as fallback
                const weekEntry = attendanceEntries.find((ts: TimesheetEntry) => {
                  const tsDate = new Date(ts.date)
                  const tsWeekStart = startOfWeek(tsDate, { weekStartsOn: 0 })
                  return ts.userId === selectedUserId &&
                         tsWeekStart.getTime() === weekStart.getTime() && 
                         ts.submissionStatus && ts.submissionStatus !== 'DRAFT'
                })
                  if (weekEntry) {
                    const status = weekEntry.submissionStatus || null
                  const id = weekEntry.submissionId || null
                  const rejectionReason = weekEntry.rejectionReason || null
                  setWeekSubmissionStatus(status)
                  setWeekSubmissionId(id)
                  setWeekRejectionReason(rejectionReason)
                  // Cache it
                  setSubmissionStatusCache(prev => new Map(prev).set(weekKey, { status, id, rejectionReason }))
                  } else {
                    setWeekSubmissionStatus(null)
                  setWeekSubmissionId(null)
                  // Cache null status
                  setSubmissionStatusCache(prev => new Map(prev).set(weekKey, { status: null, id: null }))
                }
              }
            } else {
              // Fallback to checking entries
              const weekEntry = attendanceEntries.find((ts: TimesheetEntry) => {
                const tsDate = new Date(ts.date)
                const tsWeekStart = startOfWeek(tsDate, { weekStartsOn: 0 })
                return ts.userId === selectedUserId &&
                       tsWeekStart.getTime() === weekStart.getTime() && 
                       ts.submissionStatus && ts.submissionStatus !== 'DRAFT'
              })
              if (weekEntry) {
                const status = weekEntry.submissionStatus || null
                const id = weekEntry.submissionId || null
                const rejectionReason = weekEntry.rejectionReason || null
                setWeekSubmissionStatus(status)
                setWeekSubmissionId(id)
                setWeekRejectionReason(rejectionReason)
                setSubmissionStatusCache(prev => new Map(prev).set(weekKey, { status, id, rejectionReason }))
              } else {
                setWeekSubmissionStatus(null)
                setWeekSubmissionId(null)
                setSubmissionStatusCache(prev => new Map(prev).set(weekKey, { status: null, id: null }))
              }
            }
          } catch (err) {
            console.error('Error checking submission status:', err)
            // Fallback to checking entries
            const weekEntry = attendanceEntries.find((ts: TimesheetEntry) => {
              const tsDate = new Date(ts.date)
              const tsWeekStart = startOfWeek(tsDate, { weekStartsOn: 0 })
              return ts.userId === selectedUserId &&
                     tsWeekStart.getTime() === weekStart.getTime() && 
                     ts.submissionStatus && ts.submissionStatus !== 'DRAFT'
            })
            if (weekEntry) {
              const status = weekEntry.submissionStatus || null
              const id = weekEntry.submissionId || null
              setWeekSubmissionStatus(status)
              setWeekSubmissionId(id)
              setSubmissionStatusCache(prev => new Map(prev).set(weekKey, { status, id }))
            } else {
              setWeekSubmissionStatus(null)
              setWeekSubmissionId(null)
              setSubmissionStatusCache(prev => new Map(prev).set(weekKey, { status: null, id: null }))
            }
          }
        } else {
          // When not in week view, try to preserve status from cache if we're viewing a day in a submitted week
          const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
          const weekKey = `${selectedUserId}-${weekStart.toISOString()}`
          const cachedStatus = submissionStatusCache.get(weekKey)
          if (cachedStatus) {
            // Keep the status in state even when not in week view
            setWeekSubmissionStatus(cachedStatus.status)
            setWeekSubmissionId(cachedStatus.id)
            setWeekRejectionReason(cachedStatus.rejectionReason || null)
          }
        }
      }
    } catch (error) {
      console.error('Error loading timesheets:', error)
      toast({
        title: 'Error',
        description: 'Failed to load attendance records',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
    // toast is stable from useToast hook, no need to include in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, currentDate, viewMode])

  useEffect(() => {
    loadTimesheets()
  }, [loadTimesheets])

  // Load rejected change requests and weekly submissions for notifications
  useEffect(() => {
    const loadRejectedNotifications = async () => {
      try {
        // Load dismissed notifications from localStorage
        const storedDismissed = localStorage.getItem(`dismissed-change-requests-${selectedUserId}`)
        const dismissedSet = storedDismissed ? new Set(JSON.parse(storedDismissed)) : new Set()
        setDismissedNotifications(dismissedSet)
        
        // Load dismissed weekly rejections from localStorage
        const storedWeeklyDismissed = localStorage.getItem(`dismissed-weekly-rejections-${selectedUserId}`)
        const dismissedWeeklySet = storedWeeklyDismissed ? new Set(JSON.parse(storedWeeklyDismissed)) : new Set()
        setDismissedWeeklyRejections(dismissedWeeklySet)
        
        // Load rejected change requests
        const changeRequestsResponse = await fetch(`/api/time-change-requests?status=REJECTED&userId=${selectedUserId}`)
        if (changeRequestsResponse.ok) {
          const changeRequestsData = await changeRequestsResponse.json()
          // Filter to only show recent rejections (last 7 days) and not dismissed
          const recentRejections = Array.isArray(changeRequestsData) ? changeRequestsData.filter((req: any) => {
            const rejectedAt = req.rejectedAt ? new Date(req.rejectedAt) : null
            if (!rejectedAt) return false
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            return rejectedAt >= sevenDaysAgo && !dismissedSet.has(req.id)
          }) : []
          setRejectedChangeRequests(recentRejections)
        }
        
        // Load rejected weekly submissions
        const submissionsResponse = await fetch(`/api/timesheet-submissions?userId=${selectedUserId}&status=REJECTED`)
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json()
          const submissions = Array.isArray(submissionsData) ? submissionsData : (submissionsData.data || [])
          
          // Filter to only attendance-only submissions (no job entries) and not dismissed
              const rejectedWeekly = submissions.filter((sub: any) => {
                // Check if it's attendance-only (no jobId in timeEntries)
                const hasJobEntries = sub.timeEntries && Array.isArray(sub.timeEntries) && 
                                     sub.timeEntries.some((te: any) => te.jobId)
                if (hasJobEntries) return false
                
                // Only show recent rejections (last 30 days)
                const rejectedAt = sub.rejectedAt || sub.updatedAt
                if (!rejectedAt) return false
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                if (new Date(rejectedAt) < thirtyDaysAgo) return false
                
                // Check if this specific rejection (ID + rejectedAt timestamp) was dismissed
                // Use ID + rejectedAt to handle re-rejections of the same submission
                const rejectionKey = `${sub.id}-${rejectedAt}`
                if (dismissedWeeklySet.has(rejectionKey)) return false
                
                return true
              })
          
          setRejectedWeeklySubmissions(rejectedWeekly)
        }
      } catch (error) {
        console.error('Error loading rejected notifications:', error)
      }
    }
    
    if (selectedUserId) {
      loadRejectedNotifications()
    }
  }, [selectedUserId, weekSubmissionStatus, weekSubmissionId])
  
  // Also reload notifications when timesheets are loaded (in case status changed)
  useEffect(() => {
    if (selectedUserId && !isLoading) {
      // Small delay to ensure database has been updated
      const timer = setTimeout(() => {
        const loadRejectedNotifications = async () => {
          try {
            // Load dismissed weekly rejections from localStorage
            const storedWeeklyDismissed = localStorage.getItem(`dismissed-weekly-rejections-${selectedUserId}`)
            const dismissedWeeklySet = storedWeeklyDismissed ? new Set(JSON.parse(storedWeeklyDismissed)) : new Set()
            
            // Load rejected weekly submissions
            const submissionsResponse = await fetch(`/api/timesheet-submissions?userId=${selectedUserId}&status=REJECTED`)
            if (submissionsResponse.ok) {
              const submissionsData = await submissionsResponse.json()
              const submissions = Array.isArray(submissionsData) ? submissionsData : (submissionsData.data || [])
              
              // Filter to only attendance-only submissions (no job entries) and not dismissed
              const rejectedWeekly = submissions.filter((sub: any) => {
                // Check if it's attendance-only (no jobId in timeEntries)
                const hasJobEntries = sub.timeEntries && Array.isArray(sub.timeEntries) && 
                                     sub.timeEntries.some((te: any) => te.jobId)
                if (hasJobEntries) return false
                
                // Only show recent rejections (last 30 days)
                const rejectedAt = sub.rejectedAt || sub.updatedAt
                if (!rejectedAt) return false
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                if (new Date(rejectedAt) < thirtyDaysAgo) return false
                
                // Check if this specific rejection (ID + rejectedAt timestamp) was dismissed
                // Use ID + rejectedAt to handle re-rejections of the same submission
                const rejectionKey = `${sub.id}-${rejectedAt}`
                if (dismissedWeeklySet.has(rejectionKey)) return false
                
                return true
              })
              
              setRejectedWeeklySubmissions(rejectedWeekly)
            }
          } catch (error) {
            console.error('Error reloading rejected notifications:', error)
          }
        }
        loadRejectedNotifications()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [selectedUserId, isLoading, weekSubmissionId])
  
  // Preserve submission status when switching views
  // Only clear it if we're switching to a different week
  useEffect(() => {
    // When viewMode changes, preserve submission status if we're still in week view
    // If switching away from week view, keep the status in state (don't clear it)
    // It will be reloaded when switching back to week view
  }, [viewMode])

  const handleDateClick = async (date: Date) => {
    // Normalize date to avoid timezone issues - use local date components
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    const normalizedDate = new Date(year, month, day, 12, 0, 0, 0)
    
    // Check if this date's week is submitted/approved
    const weekStart = startOfWeek(normalizedDate, { weekStartsOn: 0 })
    
    // First check if we have an entry in state for this week
    const dateEntry = Array.isArray(timesheets) ? timesheets.find(ts => {
      if (!ts || !ts.date) return false
      const tsDate = startOfDay(new Date(ts.date))
      const tsWeekStart = startOfWeek(tsDate, { weekStartsOn: 0 })
      return ts.userId === selectedUserId &&
             tsWeekStart.getTime() === weekStart.getTime() && 
             ts.submissionStatus && (ts.submissionStatus === 'SUBMITTED' || ts.submissionStatus === 'APPROVED')
    }) : null
    
    if (dateEntry) {
      toast({
        title: 'Week Locked',
        description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
        variant: 'default'
      })
      return
    }
    
    // If no entry found in state, check the API directly
    try {
      const submissionResponse = await fetch(
        `/api/timesheet-submissions?userId=${selectedUserId}&weekStart=${weekStart.toISOString()}`
      )
      if (submissionResponse.ok) {
        const submissionData = await submissionResponse.json()
        const submissions = Array.isArray(submissionData) ? submissionData : (submissionData.data || [])
        // Find submission for this week (attendance entries only - those without jobId)
        const weekSubmission = submissions.find((sub: any) => {
          const subWeekStart = new Date(sub.weekStart)
          return subWeekStart.getTime() === weekStart.getTime() &&
                 (!sub.timeEntries || !Array.isArray(sub.timeEntries) ||
                  !sub.timeEntries.some((te: any) => te.jobId)) // No job entries = attendance only
        })
        
        if (weekSubmission && (weekSubmission.status === 'SUBMITTED' || weekSubmission.status === 'APPROVED')) {
          toast({
            title: 'Week Locked',
            description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
            variant: 'default'
          })
          return
        }
      }
    } catch (err) {
      console.error('Error checking submission status:', err)
      // Continue if check fails - don't block user
    }
    
    setSelectedDate(normalizedDate)
    setSelectedEntry(null)
    setIsModalOpen(false)
    setIsDayModalOpen(true)
  }

  // Handler for clicking the day header in day view
  const handleDayHeaderClick = () => {
    if (viewMode === 'day') {
      // Check if this day's week is submitted
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const dayEntry = Array.isArray(timesheets) ? timesheets.find((ts: TimesheetEntry) => {
        const tsDate = startOfDay(new Date(ts.date))
        const tsWeekStart = startOfWeek(tsDate, { weekStartsOn: 0 })
        return ts.userId === selectedUserId &&
               tsWeekStart.getTime() === weekStart.getTime() && 
               ts.submissionStatus && (ts.submissionStatus === 'SUBMITTED' || ts.submissionStatus === 'APPROVED')
      }) : null
      
      if (dayEntry) {
        toast({
          title: 'Week Locked',
          description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
          variant: 'default'
        })
        return
      }
      
      // In day view, we don't need to set selectedDate - the modal will use currentDate directly
      // Just open the modal
      setSelectedEntry(null)
      setIsModalOpen(false)
      setIsDayModalOpen(true)
    }
  }

  const handleEntryClick = (entry: TimesheetEntry, event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    
    // Check if entry is locked
    if (entry.isLocked) {
      toast({
        title: 'Entry Locked',
        description: 'This entry has been submitted for approval and cannot be edited.',
        variant: 'default'
      })
      return
    }
    
    // Close day modal if open
    setIsDayModalOpen(false)
    // Normalize entry date
    const entryDate = new Date(entry.date)
    const year = entryDate.getFullYear()
    const month = entryDate.getMonth()
    const day = entryDate.getDate()
    const normalizedDate = new Date(year, month, day, 12, 0, 0, 0)
    setSelectedDate(normalizedDate)
    setModalDate(normalizedDate)
    setSelectedEntry(entry)
    // Small delay to ensure day modal closes first
    setTimeout(() => {
      setIsModalOpen(true)
    }, 100)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedEntry(null)
    setModalDate(null)
    if (viewMode !== 'day') {
      setSelectedDate(startOfDay(new Date()))
    }
    loadTimesheets()
  }

  const handleDayModalClose = () => {
    setIsDayModalOpen(false)
    // Don't reset selectedDate in day view - keep it synced with currentDate
    if (viewMode !== 'day') {
      setSelectedDate(null)
    }
    loadTimesheets()
  }

  const handleSubmitWeekForApproval = async () => {
    // For non-admins, always use their own user ID
    const userIdToSubmit = isAdmin ? selectedUserId : currentUserId
    
    if (!userIdToSubmit) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive'
      })
      return
    }

    // Check if already submitted or approved (but allow resubmission if rejected)
    if (weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED') {
      toast({
        title: 'Already Submitted',
        description: weekSubmissionStatus === 'APPROVED' 
          ? 'This week has already been approved and cannot be modified.'
          : 'This week has already been submitted for approval. Please wait for approval or rejection.',
        variant: 'default'
      })
      return
    }

    // Show confirmation dialog - ALWAYS show for everyone (admins and non-admins)
    const confirmationMessage = weekSubmissionStatus === 'REJECTED'
      ? 'This week was previously rejected. Are you sure you want to resubmit it for approval?\n\n' +
        '⚠️ IMPORTANT: Once resubmitted, you will NOT be able to edit or delete entries for this week until it is approved or rejected again.\n\n' +
        'Do you want to continue?'
      : 'Are you sure you want to submit this week for approval?\n\n' +
        '⚠️ IMPORTANT: Once submitted, you will NOT be able to edit or delete entries for this week until it is approved or rejected.\n\n' +
        'If rejected, you will be able to make changes and resubmit.\n\n' +
        'Do you want to continue?'
    
    const confirmed = window.confirm(confirmationMessage)
    
    if (!confirmed) {
      return
    }

    setIsSubmitting(true)
    try {
      console.log('handleSubmitWeekForApproval - Starting submission:', {
        isAdmin,
        currentUserId,
        selectedUserId,
        userIdToSubmit,
        weekSubmissionStatus
      })
      
      // Get all attendance entries for the week (entries with no job entries)
      // First, get all entries for the user being submitted
      const allUserTimesheets = Array.isArray(timesheets) ? timesheets.filter(ts => {
        return ts.userId === userIdToSubmit &&
               ts.jobEntries && Array.isArray(ts.jobEntries) && ts.jobEntries.length === 0
      }) : []
      
      if (allUserTimesheets.length === 0) {
        toast({
          title: 'No entries to submit',
          description: 'Please add attendance entries for this week before submitting',
          variant: 'destructive'
        })
        setIsSubmitting(false)
        return
      }
      
      // Group entries by week to ensure we only submit one week at a time
      // Use currentDate to determine which week to submit (the week currently being viewed)
      const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const currentWeekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
      
      // Calculate week boundaries for the current week being viewed
      const { weekStart, weekEnd } = getWeekBoundariesUTC(currentDate)
      
      // weekStart and weekEnd are already normalized to UTC
      const weekStartUTC = weekStart
      const weekEndUTC = weekEnd
      
      console.log('[Attendance] Submitting week:', {
        currentDate: currentDate.toISOString(),
        currentWeekStart: currentWeekStart.toISOString(),
        currentWeekEnd: currentWeekEnd.toISOString(),
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekStartUTC: weekStartUTC.toISOString(),
        weekEndUTC: weekEndUTC.toISOString()
      })
      
      // Filter entries to only include those within the current week being viewed
      // Normalize dates to start of day for comparison (use local dates for comparison)
      const weekStartNormalized = startOfDay(currentWeekStart)
      const weekEndNormalized = endOfDay(currentWeekEnd)
      
      const weekTimesheets = allUserTimesheets.filter(ts => {
        const tsDate = startOfDay(new Date(ts.date))
        return tsDate >= weekStartNormalized && 
               tsDate <= weekEndNormalized
      })

      if (weekTimesheets.length === 0) {
        toast({
          title: 'No entries to submit',
          description: 'Please add attendance entries for this week before submitting',
          variant: 'destructive'
        })
        setIsSubmitting(false)
        return
      }

      // Transform timesheets into submission format
      // For attendance entries, we send them without jobId (they're tracked via Timesheet records)
      const timeEntries = weekTimesheets.map(ts => {
        const clockIn = new Date(ts.clockInTime)
        const clockOut = ts.clockOutTime ? new Date(ts.clockOutTime) : null
        
        // Calculate regular hours
        let regularHours = 0
        if (clockOut) {
          regularHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
        } else if (ts.totalHours) {
          regularHours = ts.totalHours
        }

        const entry: any = {
          timesheetId: ts.id,
          date: new Date(ts.date).toISOString(), // Ensure date is ISO string
          clockInTime: clockIn.toISOString(),
          regularHours: regularHours,
          overtimeHours: 0,
          billable: true
          // No jobId for attendance entries - they're tracked via Timesheet records
        }
        
        // Only include clockOutTime if it exists
        if (clockOut) {
          entry.clockOutTime = clockOut.toISOString()
        }
        
        return entry
      })

      // Submit the entire week
      console.log('Submitting week:', {
        userId: userIdToSubmit,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekStartUTC: weekStartUTC.toISOString(),
        weekEndUTC: weekEndUTC.toISOString(),
        timeEntriesCount: timeEntries.length,
        timeEntries: timeEntries
      })

      const response = await fetch('/api/timesheet-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userIdToSubmit,
          weekStart: weekStartUTC.toISOString(),
          weekEnd: weekEndUTC.toISOString(),
          timeEntries
        }),
      })

      console.log('Response status:', response.status, response.statusText)
      
      let responseData
      try {
        responseData = await response.json()
        console.log('Response data:', responseData)
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError)
        const text = await response.text()
        console.error('Response text:', text)
        toast({
          title: 'Error',
          description: `Server error: ${response.status} ${response.statusText}`,
          variant: 'destructive'
        })
        return
      }

      if (response.ok) {
        // Extract submission ID and details
        const submission = responseData.data || responseData
        const submissionId = submission?.id || null
        const submissionStatus = submission?.status || 'SUBMITTED'
        
        toast({
          title: 'Success',
          description: `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')} submitted for approval. Your entries are now locked and cannot be edited until approved or rejected.`,
          duration: 5000
        })
        
        // Update submission status immediately
        setWeekSubmissionStatus(submissionStatus)
        setWeekSubmissionId(submissionId)
        
        // Cache the submission status - use the weekStart from the submission if available
        const submissionWeekStart = submission?.weekStart ? new Date(submission.weekStart) : weekStart
        const weekKey = `${userIdToSubmit}-${submissionWeekStart.toISOString()}`
        setSubmissionStatusCache(prev => new Map(prev).set(weekKey, { status: submissionStatus, id: submissionId }))
        
        // Small delay to ensure database is updated, then reload
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Reload timesheets to reflect the submission and locking
        // Force a full reload by clearing and reloading
        await loadTimesheets()
        
        // Reload rejected notifications in case a new rejection was created
        const loadRejectedNotifications = async () => {
          try {
            const storedWeeklyDismissed = localStorage.getItem(`dismissed-weekly-rejections-${selectedUserId}`)
            const dismissedWeeklySet = storedWeeklyDismissed ? new Set(JSON.parse(storedWeeklyDismissed)) : new Set()
            
            const submissionsResponse = await fetch(`/api/timesheet-submissions?userId=${selectedUserId}&status=REJECTED`)
            if (submissionsResponse.ok) {
              const submissionsData = await submissionsResponse.json()
              const submissions = Array.isArray(submissionsData) ? submissionsData : (submissionsData.data || [])
              
              const rejectedWeekly = submissions.filter((sub: any) => {
                const hasJobEntries = sub.timeEntries && Array.isArray(sub.timeEntries) && 
                                     sub.timeEntries.some((te: any) => te.jobId)
                if (hasJobEntries) return false
                if (dismissedWeeklySet.has(sub.id)) return false
                const rejectedAt = sub.rejectedAt || sub.updatedAt
                if (!rejectedAt) return false
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                return new Date(rejectedAt) >= thirtyDaysAgo
              })
              
              setRejectedWeeklySubmissions(rejectedWeekly)
            }
          } catch (error) {
            console.error('Error reloading rejected notifications:', error)
          }
        }
        // Small delay to ensure database has been updated
        setTimeout(() => {
          loadRejectedNotifications()
        }, 1000)
        
        // Also update all entries in state to mark them as locked
        setTimesheets(prev => prev.map(ts => {
          const tsDate = new Date(ts.date)
          const tsWeekStart = startOfWeek(tsDate, { weekStartsOn: 0 })
          if (ts.userId === userIdToSubmit && 
              tsWeekStart.getTime() === weekStart.getTime()) {
            return {
              ...ts,
              submissionStatus: submissionStatus,
              submissionId: submissionId,
              isLocked: true
            }
          }
          return ts
        }))
      } else {
        console.error('Submission error:', {
          status: response.status,
          statusText: response.statusText,
          responseData
        })
        const errorMessage = responseData.error || 
                             responseData.details?.[0]?.message || 
                             responseData.message ||
                             `Failed to submit timesheet (${response.status})`
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit timesheet',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler that will open the entry modal using the date passed or default to the current date
  // CRITICAL: Always use the date parameter if provided - that's the date the user clicked on
  const handleAddEntry = useCallback(async (date?: Date) => {
    setIsDayModalOpen(false)
    // If date is provided, use it (from day modal) - normalize to avoid timezone issues
    // Otherwise use currentDateRef
    let finalDate: Date
    if (date) {
      const year = date.getFullYear()
      const month = date.getMonth()
      const day = date.getDate()
      finalDate = new Date(year, month, day, 12, 0, 0, 0)
    } else {
      const latestDate = currentDateRef.current
      const year = latestDate.getFullYear()
      const month = latestDate.getMonth()
      const day = latestDate.getDate()
      finalDate = new Date(year, month, day, 12, 0, 0, 0)
    }
    
    // Check if this is today - only allow clock in/out for today
    const today = startOfDay(new Date())
    const selectedDay = startOfDay(finalDate)
    const isToday = selectedDay.getTime() === today.getTime()
    
    if (!isToday) {
      // For past days, open modal in "Request Change" mode
      // First check if week is locked
      const weekStart = startOfWeek(finalDate, { weekStartsOn: 0 })
      
      // Check if week is submitted/approved
      const dateEntry = Array.isArray(timesheets) ? timesheets.find(ts => {
        if (!ts || !ts.date) return false
        const tsDate = startOfDay(new Date(ts.date))
        const tsWeekStart = startOfWeek(tsDate, { weekStartsOn: 0 })
        return ts.userId === selectedUserId &&
               tsWeekStart.getTime() === weekStart.getTime() && 
               ts.submissionStatus && (ts.submissionStatus === 'SUBMITTED' || ts.submissionStatus === 'APPROVED')
      }) : null
      
      if (dateEntry) {
        toast({
          title: 'Week Locked',
          description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
          variant: 'default'
        })
        return
      }
      
      // Check API if needed
      try {
        const submissionResponse = await fetch(
          `/api/timesheet-submissions?userId=${selectedUserId}&weekStart=${weekStart.toISOString()}`
        )
        if (submissionResponse.ok) {
          const submissionData = await submissionResponse.json()
          const submissions = Array.isArray(submissionData) ? submissionData : (submissionData.data || [])
          const weekSubmission = submissions.find((sub: any) => {
            const subWeekStart = new Date(sub.weekStart)
            return subWeekStart.getTime() === weekStart.getTime() &&
                   (!sub.timeEntries || !Array.isArray(sub.timeEntries) ||
                    !sub.timeEntries.some((te: any) => te.jobId))
          })
          
          if (weekSubmission && (weekSubmission.status === 'SUBMITTED' || weekSubmission.status === 'APPROVED')) {
            toast({
              title: 'Week Locked',
              description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
              variant: 'default'
            })
            return
          }
        }
      } catch (err) {
        console.error('Error checking submission status:', err)
      }
      
      // Open modal for past day - will show "Request Change" option
      setModalDate(finalDate)
      setSelectedDate(finalDate)
      setSelectedEntry(null)
      setTimeout(() => {
        setIsModalOpen(true)
      }, 100)
      return
    }
    
    // For today, check if week is submitted/approved
    const weekStart = startOfWeek(finalDate, { weekStartsOn: 0 })
    
    // First check if we have an entry in state for this week
    const dateEntry = Array.isArray(timesheets) ? timesheets.find(ts => {
      if (!ts || !ts.date) return false
      const tsDate = startOfDay(new Date(ts.date))
      const tsWeekStart = startOfWeek(tsDate, { weekStartsOn: 0 })
      return ts.userId === selectedUserId &&
             tsWeekStart.getTime() === weekStart.getTime() && 
             ts.submissionStatus && (ts.submissionStatus === 'SUBMITTED' || ts.submissionStatus === 'APPROVED')
    }) : null
    
    if (dateEntry) {
      toast({
        title: 'Week Locked',
        description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
        variant: 'default'
      })
      return
    }
    
    // If no entry found in state, check the API directly
    try {
      const submissionResponse = await fetch(
        `/api/timesheet-submissions?userId=${selectedUserId}&weekStart=${weekStart.toISOString()}`
      )
      if (submissionResponse.ok) {
        const submissionData = await submissionResponse.json()
        const submissions = Array.isArray(submissionData) ? submissionData : (submissionData.data || [])
        // Find submission for this week (attendance entries only - those without jobId)
        const weekSubmission = submissions.find((sub: any) => {
          const subWeekStart = new Date(sub.weekStart)
          return subWeekStart.getTime() === weekStart.getTime() &&
                 (!sub.timeEntries || !Array.isArray(sub.timeEntries) ||
                  !sub.timeEntries.some((te: any) => te.jobId)) // No job entries = attendance only
        })
        
        if (weekSubmission && (weekSubmission.status === 'SUBMITTED' || weekSubmission.status === 'APPROVED')) {
          toast({
            title: 'Week Locked',
            description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
            variant: 'default'
          })
          return
        }
      }
    } catch (err) {
      console.error('Error checking submission status:', err)
      // Continue if check fails - don't block user
    }
    
    // Set modalDate and selectedDate, then open modal (for today - allows clock in/out)
    setModalDate(finalDate)
    setSelectedDate(finalDate)
    setSelectedEntry(null)
    // Small delay to ensure day modal closes first
    setTimeout(() => {
      setIsModalOpen(true)
    }, 100)
  }, [weekSubmissionStatus, timesheets, selectedUserId, currentDate, toast])

  // Handler for the main "Add Entry" button - only works for today
  const handleMainAddEntry = useCallback(() => {
    const today = startOfDay(new Date())
    const currentDay = startOfDay(currentDateRef.current)
    
    if (currentDay.getTime() !== today.getTime()) {
      toast({
        title: 'Clock In/Out Restricted',
        description: 'You can only clock in or clock out for today. For past days, please use "Request Change" from the day view.',
        variant: 'default'
      })
      return
    }
    
    handleAddEntry() // Will read latest currentDate from state setter
  }, [handleAddEntry, toast])

  const handleEditEntry = async (entry: TimesheetEntry) => {
    // Check if entry is locked
    const isLocked = entry.isLocked || entry.submissionStatus === 'SUBMITTED' || entry.submissionStatus === 'APPROVED'
    
    if (isLocked) {
      toast({
        title: 'Entry Locked',
        description: 'This entry has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
        variant: 'default'
      })
      return
    }
    
    // Check if the week is locked - check API if needed
    const entryDate = new Date(entry.date)
    const weekStart = startOfWeek(entryDate, { weekStartsOn: 0 })
    
    // First check if we have an entry in state for this week
    const weekEntry = Array.isArray(timesheets) ? timesheets.find(ts => {
      if (!ts || !ts.date) return false
      const tsDate = startOfDay(new Date(ts.date))
      const tsWeekStart = startOfWeek(tsDate, { weekStartsOn: 0 })
      return ts.userId === selectedUserId &&
             tsWeekStart.getTime() === weekStart.getTime() && 
             ts.submissionStatus && (ts.submissionStatus === 'SUBMITTED' || ts.submissionStatus === 'APPROVED')
    }) : null
    
    if (weekEntry) {
      toast({
        title: 'Week Locked',
        description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
        variant: 'default'
      })
      return
    }
    
    // If no entry found in state, check the API directly
    try {
      const submissionResponse = await fetch(
        `/api/timesheet-submissions?userId=${selectedUserId}&weekStart=${weekStart.toISOString()}`
      )
      if (submissionResponse.ok) {
        const submissionData = await submissionResponse.json()
        const submissions = Array.isArray(submissionData) ? submissionData : (submissionData.data || [])
        // Find submission for this week (attendance entries only - those without jobId)
        const weekSubmission = submissions.find((sub: any) => {
          const subWeekStart = new Date(sub.weekStart)
          return subWeekStart.getTime() === weekStart.getTime() &&
                 (!sub.timeEntries || !Array.isArray(sub.timeEntries) ||
                  !sub.timeEntries.some((te: any) => te.jobId)) // No job entries = attendance only
        })
        
        if (weekSubmission && (weekSubmission.status === 'SUBMITTED' || weekSubmission.status === 'APPROVED')) {
          toast({
            title: 'Week Locked',
            description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
            variant: 'default'
          })
          return
        }
      }
    } catch (err) {
      console.error('Error checking submission status:', err)
      // Continue if check fails - don't block user
    }
    
    setIsDayModalOpen(false)
    const normalizedEntryDate = startOfDay(entryDate)
    setSelectedDate(normalizedEntryDate)
    setModalDate(normalizedEntryDate)
    setSelectedEntry(entry)
    setTimeout(() => {
      setIsModalOpen(true)
    }, 0)
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = startOfDay(direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
      // In day view, update selectedDate to keep it in sync
      if (viewMode === 'day') {
        setSelectedDate(newDate)
      }
      return newDate
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    const today = startOfDay(new Date())
    setCurrentDate(today)
    if (viewMode === 'day') {
      setSelectedDate(today)
    }
  }

  const getTimesheetsForDate = (date: Date): TimesheetEntry[] => {
    return Array.isArray(timesheets) ? timesheets.filter(ts => {
      const tsDate = new Date(ts.date)
      return isSameDay(tsDate, date)
    }) : []
  }

  const calculateDayTotal = (date: Date): number => {
    const dayTimesheets = getTimesheetsForDate(date)
    return dayTimesheets.reduce((sum, ts) => {
      if (ts.totalHours) return sum + ts.totalHours
      if (ts.clockOutTime) {
        const inTime = new Date(ts.clockInTime)
        const outTime = new Date(ts.clockOutTime)
        return sum + (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
      }
      return sum
    }, 0)
  }

  // Week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {/* Header */}
        {weekDays.map((day, idx) => (
          <div key={idx} className="hidden sm:block text-center font-semibold text-gray-700 py-2 border-b">
            {format(day, 'EEE')}
            <div className="text-sm font-normal text-gray-500">{format(day, 'MMM d')}</div>
          </div>
        ))}

        {/* Days */}
        {weekDays.map((day, idx) => {
          const dayTimesheets = getTimesheetsForDate(day)
          const dayTotal = calculateDayTotal(day)
          const isToday = isSameDay(day, new Date())

          // Check if week is submitted/approved - grey out entire day card
          const isWeekLocked = weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED'
          
          return (
            <div
              key={idx}
              className={`min-h-[200px] border-2 rounded-lg p-2 transition-colors ${
                isWeekLocked
                  ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                  : isToday 
                    ? 'border-blue-500 bg-blue-50/40 cursor-pointer' 
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer'
              }`}
              onClick={() => {
                // Check if week is submitted/approved
                if (isWeekLocked) {
                  toast({
                    title: 'Week Locked',
                    description: 'This week has been submitted for approval and cannot be edited. Please wait for approval or rejection.',
                    variant: 'default'
                  })
                  return
                }
                
                handleDateClick(day)
              }}
            >
              <div className="text-xs font-medium text-gray-600 mb-2">
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayTimesheets.length === 0 ? (
                  <div className="text-xs text-gray-400 italic text-center py-2">
                    No entries
                  </div>
                ) : (
                  dayTimesheets.map((ts) => {
                    // Lock if week is submitted OR individual entry is locked
                    const isLocked = isWeekLocked || ts.isLocked || ts.submissionStatus === 'SUBMITTED' || ts.submissionStatus === 'APPROVED'
                    return (
                      <div
                        key={ts.id}
                        onClick={(e) => {
                          if (!isLocked) {
                            handleEntryClick(ts, e)
                          } else {
                            e.stopPropagation()
                            toast({
                              title: 'Entry Locked',
                              description: 'This entry has been submitted for approval and cannot be edited.',
                              variant: 'default'
                            })
                          }
                        }}
                        className={`text-xs p-1.5 border rounded transition-colors ${
                          isLocked
                            ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                            : 'bg-blue-100 border-blue-200 hover:bg-blue-200 cursor-pointer'
                        }`}
                      >
                        <div className="font-medium text-blue-800">
                          {(() => {
                            const clockIn = new Date(ts.clockInTime)
                            const clockOut = ts.clockOutTime ? new Date(ts.clockOutTime) : null
                            if (isNaN(clockIn.getTime())) {
                              return 'Invalid time'
                            }
                            return `${format(clockIn, 'h:mm a')}${clockOut ? ` - ${format(clockOut, 'h:mm a')}` : ''}`
                          })()}
                        </div>
                        {ts.totalHours && (
                          <div className="text-blue-600">{ts.totalHours.toFixed(2)}h</div>
                        )}
                        {isLocked && (
                          <div className="text-xs text-yellow-700 mt-1 font-medium">
                            {ts.submissionStatus === 'APPROVED' ? '✓ Approved' : 'Submitted'}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {dayTotal > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-xs font-bold text-blue-700 text-center">
                    {dayTotal.toFixed(2)}h
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Day view
  const renderDayView = () => {
    const dayTimesheets = getTimesheetsForDate(currentDate)
    const dayTotal = calculateDayTotal(currentDate)
    const isToday = isSameDay(currentDate, new Date())

    return (
      <div className="w-full">
        {/* Day Header */}
        <div 
          onClick={handleDayHeaderClick}
          className={`mb-4 p-4 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors ${
            isToday 
              ? 'border-blue-400 bg-blue-50/30' 
              : 'border-gray-200 bg-white'
          }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base sm:text-xl font-bold text-gray-900">
                <span className="sm:hidden">{format(currentDate, 'EEE, MMM d, yyyy')}</span>
                <span className="hidden sm:inline">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
              </h3>
              {isToday && (
                <p className="text-sm text-blue-600 font-medium mt-1">Today</p>
              )}
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {dayTotal.toFixed(2)}h
            </div>
          </div>
        </div>

        {/* Clock In/Out Entries */}
        {dayTimesheets.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Clock In/Out Entries
            </h4>
            <div className="space-y-2">
              {dayTimesheets.map((ts) => (
                <div
                  key={ts.id}
                  onClick={(e) => handleEntryClick(ts, e)}
                  className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-semibold text-blue-800 text-lg">
                        {(() => {
                          const clockIn = new Date(ts.clockInTime)
                          const clockOut = ts.clockOutTime ? new Date(ts.clockOutTime) : null
                          if (isNaN(clockIn.getTime())) {
                            return 'Invalid time'
                          }
                          return `${format(clockIn, 'h:mm a')}${clockOut ? ` - ${format(clockOut, 'h:mm a')}` : ''}`
                        })()}
                      </div>
                      {ts.totalHours && (
                        <div className="text-blue-600 font-medium mt-1">
                          {ts.totalHours.toFixed(2)} hours
                        </div>
                      )}
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        ts.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : ts.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ts.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {dayTimesheets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No entries for this day</p>
            <p className="text-sm">Click "Add Attendance" to create a new attendance entry</p>
          </div>
        )}
      </div>
    )
  }

  // Month view
  // Month view - calendar grid with day cells
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const monthStartWeek = startOfWeek(monthStart, { weekStartsOn: 0 })
    const monthEndWeek = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const calendarDays = eachDayOfInterval({ start: monthStartWeek, end: monthEndWeek })
    
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()

    return (
      <div className="w-full">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Day Headers */}
          {weekDays.map((dayName) => (
            <div
              key={dayName}
              className="text-center font-semibold text-gray-700 py-2 text-xs sm:text-sm border-b border-gray-200"
            >
              {dayName}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((day, idx) => {
            const dayTimesheets = getTimesheetsForDate(day)
            const dayTotal = calculateDayTotal(day)
            const isToday = isSameDay(day, today)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = viewMode === 'day' && isSameDay(day, currentDate)
            const hasEntries = dayTimesheets.length > 0

            return (
              <div
                key={idx}
                onClick={() => {
                  setCurrentDate(startOfDay(day))
                  setViewMode('day')
                  setSelectedDate(startOfDay(day))
                }}
                className={`
                  min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border rounded-lg cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-300' 
                    : isToday
                    ? 'border-blue-300 bg-blue-50/50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                  }
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                `}
              >
                {/* Day Number */}
                <div className={`
                  text-xs sm:text-sm font-medium mb-1
                  ${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}
                  ${isSelected ? 'text-blue-700' : ''}
                `}>
                  {format(day, 'd')}
                </div>

                {/* Entry Indicators */}
                {hasEntries && (
                  <div className="flex flex-col gap-0.5">
                    {dayTimesheets.slice(0, 2).map((ts) => (
                      <div
                        key={ts.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEntryClick(ts, e)
                        }}
                        className="text-[10px] sm:text-xs px-1 py-0.5 bg-blue-100 border border-blue-200 rounded truncate hover:bg-blue-200 transition-colors"
                        title={`${format(new Date(ts.clockInTime), 'h:mm a')} - ${ts.totalHours?.toFixed(2) || 0}h`}
                      >
                        {(() => {
                          const clockIn = new Date(ts.clockInTime)
                          if (isNaN(clockIn.getTime())) return 'Invalid'
                          return format(clockIn, 'h:mm a')
                        })()}
                      </div>
                    ))}
                    {dayTimesheets.length > 2 && (
                      <div className="text-[10px] text-blue-600 font-medium px-1">
                        +{dayTimesheets.length - 2} more
                      </div>
                    )}
                  </div>
                )}

                {/* Total Hours Indicator */}
                {dayTotal > 0 && (
                  <div className="mt-1 pt-1 border-t border-gray-200">
                    <div className="text-[10px] sm:text-xs font-bold text-blue-700 text-center">
                      {dayTotal.toFixed(1)}h
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Weekly Submission Rejection Notifications */}
      {rejectedWeeklySubmissions.length > 0 && (
        <div className="space-y-2">
          {rejectedWeeklySubmissions.map((submission) => (
            <div
              key={submission.id}
              className="p-4 bg-red-50 border-2 border-red-300 rounded-lg shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-red-900 mb-1">
                      ⚠️ Weekly Submission Rejected
                    </div>
                    <div className="text-sm text-red-800 mb-2">
                      <div className="mb-1">
                        <span className="font-medium">Week:</span>{' '}
                        {format(new Date(submission.weekStart), 'MMM d')} - {format(new Date(submission.weekEnd), 'MMM d, yyyy')}
                      </div>
                      {submission.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-100 rounded border border-red-200">
                          <span className="font-medium">Rejection Reason:</span>{' '}
                          {submission.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Use submission ID + rejectedAt timestamp as the dismissal key
                    // This allows the same submission to show again if re-rejected with a new timestamp
                    const rejectionKey = submission.rejectedAt 
                      ? `${submission.id}-${submission.rejectedAt}`
                      : `${submission.id}-${new Date().toISOString()}`
                    
                    // Save to localStorage to persist dismissal
                    const newDismissed = new Set(dismissedWeeklyRejections)
                    newDismissed.add(rejectionKey)
                    setDismissedWeeklyRejections(newDismissed)
                    localStorage.setItem(`dismissed-weekly-rejections-${selectedUserId}`, JSON.stringify(Array.from(newDismissed)))
                    // Remove from display
                    setRejectedWeeklySubmissions(prev => prev.filter(s => {
                      const sRejectionKey = s.rejectedAt 
                        ? `${s.id}-${s.rejectedAt}`
                        : `${s.id}-${new Date().toISOString()}`
                      return sRejectionKey !== rejectionKey
                    }))
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Rejected Change Requests Notifications */}
      {rejectedChangeRequests.length > 0 && (
        <div className="space-y-2">
          {rejectedChangeRequests.map((request) => (
            <div
              key={request.id}
              className="p-4 bg-red-50 border-2 border-red-300 rounded-lg shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-red-900 mb-1">
                      ⚠️ Attendance Change Request Rejected
                    </div>
                    <div className="text-sm text-red-800 mb-2">
                      <div className="mb-1">
                        <span className="font-medium">Date:</span>{' '}
                        {format(new Date(request.date), 'MMM d, yyyy')}
                      </div>
                      <div className="mb-1">
                        <span className="font-medium">Requested Time:</span>{' '}
                        {format(new Date(request.requestedClockInTime), 'h:mm a')}
                        {request.requestedClockOutTime && 
                          ` - ${format(new Date(request.requestedClockOutTime), 'h:mm a')}`
                        }
                      </div>
                      {request.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-100 rounded border border-red-200">
                          <span className="font-medium">Rejection Reason:</span>{' '}
                          {request.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Save to localStorage to persist dismissal
                    const newDismissed = new Set(dismissedNotifications)
                    newDismissed.add(request.id)
                    setDismissedNotifications(newDismissed)
                    localStorage.setItem(`dismissed-change-requests-${selectedUserId}`, JSON.stringify(Array.from(newDismissed)))
                    // Remove from display
                    setRejectedChangeRequests(prev => prev.filter(r => r.id !== request.id))
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Attendance (Clock In/Out)
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {isAdmin && (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                )}

                <Button
                  onClick={handleMainAddEntry}
                  disabled={weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED'}
                  className={`font-semibold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-4 py-2 rounded-lg ${
                    weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED'
                      ? 'bg-gray-400 cursor-not-allowed opacity-60'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                  }`}
                  size="sm"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Attendance</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week' | 'month')} className="w-full sm:w-auto">
                <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <TabsTrigger 
                    value="day" 
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md min-h-[44px] sm:min-h-[36px]"
                  >
                    Day
                  </TabsTrigger>
                  <TabsTrigger 
                    value="week" 
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md min-h-[44px] sm:min-h-[36px]"
                  >
                    Week
                  </TabsTrigger>
                  <TabsTrigger 
                    value="month" 
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md min-h-[44px] sm:min-h-[36px]"
                  >
                    Month
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (viewMode === 'day') navigateDay('prev')
                    else if (viewMode === 'week') navigateWeek('prev')
                    else navigateMonth('prev')
                  }}
                  className="flex-1 sm:flex-initial border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 font-semibold text-gray-700 hover:text-blue-700 transition-all duration-200 min-h-[44px] rounded-lg shadow-sm hover:shadow-md"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="ml-1 hidden sm:inline">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="flex-1 sm:flex-initial border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 font-semibold text-blue-700 hover:text-blue-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-sm hover:shadow-md"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (viewMode === 'day') navigateDay('next')
                    else if (viewMode === 'week') navigateWeek('next')
                    else navigateMonth('next')
                  }}
                  className="flex-1 sm:flex-initial border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 font-semibold text-gray-700 hover:text-blue-700 transition-all duration-200 min-h-[44px] rounded-lg shadow-sm hover:shadow-md"
                >
                  <span className="mr-1 hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="text-base sm:text-lg font-bold text-gray-900 px-3 py-2 text-center sm:text-left bg-gray-50 rounded-lg border border-gray-200">
                  {viewMode === 'day'
                    ? (
                        <>
                          <span className="sm:hidden">{format(currentDate, 'EEE, MMM d, yyyy')}</span>
                          <span className="hidden sm:inline">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
                        </>
                      )
                    : viewMode === 'week'
                    ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'M/d')} - ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'M/d')}`
                    : (
                        <>
                          <span className="sm:hidden">{format(currentDate, 'MMM yyyy')}</span>
                          <span className="hidden sm:inline">{format(currentDate, 'MMMM yyyy')}</span>
                        </>
                      )
                  }
                </div>
                {/* Submit for Approval button - show in week view, next to date */}
                {viewMode === 'week' && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Button
                      onClick={handleSubmitWeekForApproval}
                      disabled={isSubmitting || !selectedUserId || (weekSubmissionStatus && (weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED'))}
                      className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm sm:text-base font-bold shadow-lg hover:shadow-xl active:shadow-inner transition-all duration-200 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap disabled:hover:bg-orange-500"
                      size="sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                          <span className="font-semibold">Submitting...</span>
                        </>
                      ) : weekSubmissionStatus === 'REJECTED' ? (
                        <>
                          <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          <span className="hidden sm:inline font-semibold">Resubmit for Approval</span>
                          <span className="sm:hidden font-semibold">Resubmit</span>
                        </>
                      ) : weekSubmissionStatus === 'SUBMITTED' || weekSubmissionStatus === 'APPROVED' ? (
                        <>
                          <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          <span className="hidden sm:inline font-semibold">Submitted</span>
                          <span className="sm:hidden font-semibold">Submitted</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          <span className="hidden sm:inline font-semibold">Submit for Approval</span>
                          <span className="sm:hidden font-semibold">Submit</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading attendance records...</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
              {viewMode === 'day' 
                ? renderDayView() 
                : viewMode === 'week' 
                ? renderWeekView() 
                : renderMonthView()
              }
            </div>
          )}
        </CardContent>
      </Card>

      <DayTimesheetModal
        isOpen={isDayModalOpen && !!selectedDate}
        onClose={handleDayModalClose}
        selectedDate={viewMode === 'day' ? currentDate : (selectedDate || currentDate)}
        timesheets={timesheets}
        onAddEntry={handleAddEntry}
        onEditEntry={handleEditEntry}
        userId={selectedUserId}
        jobs={[]}
        laborCodes={[]}
        getCurrentDate={getCurrentDate}
        mode="clock"
        key={viewMode === 'day' ? `day-modal-${currentDate.getTime()}` : `day-modal-${selectedDate?.getTime() || 'none'}`}
      />

      {isModalOpen && !isDayModalOpen && modalDate && (
        <TimeEntryModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          selectedDate={modalDate}
          selectedEntry={selectedEntry}
          userId={selectedUserId}
          userName={users.find(u => u.id === selectedUserId)?.name || users.find(u => u.id === selectedUserId)?.email || ''}
          users={users}
          jobs={[]}
          laborCodes={[]}
          isAdmin={isAdmin}
          mode="clock"
          key={`time-entry-${modalDate.toISOString()}-${selectedEntry?.id || 'new'}`}
        />
      )}
    </div>
  )
}

