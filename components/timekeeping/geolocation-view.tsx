'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Switch } from '@/components/ui/switch'
import { MapPin, Calendar, Clock, User, AlertCircle, Settings2, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'

interface GeolocationEntry {
  id: string
  timesheetId: string
  userId: string
  userName: string
  userEmail: string
  type: 'Clock In' | 'Clock Out'
  date: string
  time: string
  lat: number
  lon: number
  accuracy: number | null
  locationDenied: boolean
}

interface Employee {
  id: string
  name: string | null
  email: string
  isActive: boolean
}

export function GeolocationView() {
  const { toast } = useToast()
  const [locations, setLocations] = useState<GeolocationEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedEmployeeLocations, setSelectedEmployeeLocations] = useState<GeolocationEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [geolocationEnabled, setGeolocationEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('attendance-geolocation-enabled')
      return saved !== null ? saved === 'true' : true // Default to enabled
    }
    return true
  })
  
  // Week selector state - default to current week
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const today = new Date()
    return startOfWeek(today, { weekStartsOn: 0 }) // Sunday
  })

  // Use ref to persist employees list across re-renders
  const employeesRef = useRef<Employee[]>([])

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (employees.length === 0 && employeesRef.current.length > 0) {
      setEmployees(employeesRef.current)
    } else if (employees.length === 0) {
      loadEmployees()
    }
  }, [employees.length])

  useEffect(() => {
    loadLocations()
  }, [selectedWeekStart, selectedEmployee])

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/employees?includeInactive=false')
      if (response.ok) {
        const data = await response.json()
        const employeesList = Array.isArray(data) ? data : (data.employees || data.data || [])
        if (employeesList.length > 0) {
          employeesRef.current = employeesList
          setEmployees(employeesList)
        }
      }
    } catch (error) {
      console.error('Error loading employees:', error)
    }
  }

  const loadLocations = async () => {
    setIsLoading(true)
    try {
      const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 0 })
      const startDate = selectedWeekStart.toISOString()
      const endDate = weekEnd.toISOString()
      
      let url = `/api/timesheets/locations?startDate=${startDate}&endDate=${endDate}`
      if (selectedEmployee) {
        url += `&userId=${selectedEmployee.id}`
      }
      
      console.log('[GeolocationView] Fetching locations from:', url)
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        console.log('[GeolocationView] API response:', data)
        const locationsList = data.data || []
        console.log('[GeolocationView] Locations list:', locationsList.length, 'entries')
        setLocations(locationsList)
        
        // If viewing a specific employee, filter their locations
        if (selectedEmployee) {
          const employeeLocations = locationsList.filter((loc: GeolocationEntry) => 
            loc.userId === selectedEmployee.id
          )
          console.log('[GeolocationView] Employee locations:', employeeLocations.length, 'for', selectedEmployee.name)
          setSelectedEmployeeLocations(employeeLocations)
        } else {
          setSelectedEmployeeLocations([])
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('[GeolocationView] API error:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to load geolocation data')
      }
    } catch (error: any) {
      console.error('Error loading geolocation data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load geolocation data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openMap = (lat: number, lon: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lon}`
    window.open(url, '_blank')
  }

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    // Locations will be filtered in loadLocations
  }

  const handleBackToList = () => {
    setSelectedEmployee(null)
    setSelectedEmployeeLocations([])
  }

  // Filter employees by search query
  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query)
    )
  })

  // Get location count per employee for the selected week
  const getEmployeeLocationCount = (employeeId: string) => {
    return locations.filter(loc => loc.userId === employeeId).length
  }

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedWeekStart(subWeeks(selectedWeekStart, 1))
    } else {
      setSelectedWeekStart(addWeeks(selectedWeekStart, 1))
    }
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    setSelectedWeekStart(startOfWeek(today, { weekStartsOn: 0 }))
  }

  const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 0 })
  const weekRange = `${format(selectedWeekStart, 'MMM d, yyyy')} - ${format(weekEnd, 'MMM d, yyyy')}`

  if (isLoading && employees.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MapPin className="h-8 w-8 mx-auto mb-2 animate-spin" />
        <p>Loading geolocation data...</p>
      </div>
    )
  }

  // If viewing a specific employee's locations
  if (selectedEmployee) {
    return (
      <div className="space-y-4">
        {/* Geolocation Settings - Compact at top */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
                  <Settings2 className="h-5 w-5 text-blue-600" />
                  Geolocation Settings
                </CardTitle>
                <CardDescription className="mt-1">
                  Control whether geolocation is captured when employees clock in/out
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border-2 border-blue-300 shadow-sm">
                <MapPin className={`h-5 w-5 ${geolocationEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="flex flex-col">
                  <label htmlFor="geolocation-toggle" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    {geolocationEnabled ? 'Enabled' : 'Disabled'}
                  </label>
                  <span className="text-xs text-gray-500">
                    {geolocationEnabled ? 'Location tracking active' : 'Location tracking off'}
                  </span>
                </div>
                <Switch
                  id="geolocation-toggle"
                  checked={geolocationEnabled}
                  onCheckedChange={(checked) => {
                    setGeolocationEnabled(checked)
                    localStorage.setItem('attendance-geolocation-enabled', String(checked))
                    window.dispatchEvent(new Event('geolocation-setting-changed'))
                    toast({
                      title: checked ? 'Geolocation Enabled' : 'Geolocation Disabled',
                      description: checked 
                        ? 'Location tracking will be captured on clock in/out'
                        : 'Location tracking has been disabled',
                    })
                  }}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Details View */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-5 w-5 text-gray-500" />
                  <h3 className="text-lg font-semibold">{selectedEmployee.name || selectedEmployee.email}</h3>
                </div>
                <p className="text-sm text-gray-500">Clock-in/out locations for {weekRange}</p>
              </div>
              <Button variant="outline" onClick={handleBackToList}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
            </div>
            {selectedEmployeeLocations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No geolocation data available for this employee during this week.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEmployeeLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>
                        <Badge variant={location.type === 'Clock In' ? 'default' : 'secondary'}>
                          {location.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(location.date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {format(new Date(location.time), 'h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {location.accuracy ? (
                          <span className="text-sm">{Math.round(location.accuracy)}m</span>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMap(location.lat, location.lon)}
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          View Map
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main employee list view
  return (
    <div className="space-y-4">
      {/* Geolocation Settings - Compact at top */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
                <Settings2 className="h-5 w-5 text-blue-600" />
                Geolocation Settings
              </CardTitle>
              <CardDescription className="mt-1">
                Control whether geolocation is captured when employees clock in/out
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border-2 border-blue-300 shadow-sm">
              <MapPin className={`h-5 w-5 ${geolocationEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="flex flex-col">
                <label htmlFor="geolocation-toggle" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  {geolocationEnabled ? 'Enabled' : 'Disabled'}
                </label>
                <span className="text-xs text-gray-500">
                  {geolocationEnabled ? 'Location tracking active' : 'Location tracking off'}
                </span>
              </div>
              <Switch
                id="geolocation-toggle"
                checked={geolocationEnabled}
                onCheckedChange={(checked) => {
                  setGeolocationEnabled(checked)
                  localStorage.setItem('attendance-geolocation-enabled', String(checked))
                  // Dispatch custom event to notify other components
                  window.dispatchEvent(new Event('geolocation-setting-changed'))
                  toast({
                    title: checked ? 'Geolocation Enabled' : 'Geolocation Disabled',
                    description: checked 
                      ? 'Location tracking will be captured on clock in/out'
                      : 'Location tracking has been disabled',
                  })
                }}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Selector and Search - Match approvals tab exactly */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Week Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{weekRange}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
              >
                Today
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardContent className="pt-6">

          {isLoading && employees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MapPin className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading employees and locations...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No employees found</p>
              <p className="text-sm">{searchQuery ? 'Try a different search term' : 'No employees available'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Locations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const locationCount = getEmployeeLocationCount(employee.id)
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            {employee.name || employee.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            {weekRange}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={locationCount > 0 ? 'default' : 'secondary'}>
                            {locationCount} {locationCount === 1 ? 'location' : 'locations'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewEmployee(employee)}
                            disabled={locationCount === 0}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Locations
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
