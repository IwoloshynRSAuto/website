'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { MapPin, Eye, Calendar, User, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { MapViewerModal } from './map-viewer-modal'

interface AttendanceLocation {
  id: string
  timesheetId: string
  userId: string
  userName: string
  type: 'Clock In' | 'Clock Out'
  date: string
  time: string
  lat: number | null
  lon: number | null
  accuracy: number | null
  locationDenied: boolean
}

export function AttendanceLocationsPage() {
  const [locations, setLocations] = useState<AttendanceLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<AttendanceLocation | null>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [filterUserId, setFilterUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchLocations()
  }, [filterUserId, startDate, endDate])

  const fetchLocations = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterUserId) params.append('userId', filterUserId)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/timesheets/locations?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLocations(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewMap = (location: AttendanceLocation) => {
    setSelectedLocation(location)
    setIsMapOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Attendance Locations</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          View geolocation data for all clock-in and clock-out events
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="userId">User ID (optional)</Label>
              <Input
                id="userId"
                placeholder="Filter by user ID"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Locations ({locations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No location data found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Latitude</TableHead>
                    <TableHead>Longitude</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.userName}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          location.type === 'Clock In' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {location.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(location.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(location.time), 'h:mm a')}
                      </TableCell>
                      <TableCell>
                        {location.lat !== null ? location.lat.toFixed(6) : '-'}
                      </TableCell>
                      <TableCell>
                        {location.lon !== null ? location.lon.toFixed(6) : '-'}
                      </TableCell>
                      <TableCell>
                        {location.accuracy !== null ? `${Math.round(location.accuracy)}m` : '-'}
                      </TableCell>
                      <TableCell>
                        {location.locationDenied ? (
                          <span className="text-orange-600 text-sm">Location Denied</span>
                        ) : location.lat !== null ? (
                          <span className="text-green-600 text-sm">Available</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {location.lat !== null && location.lon !== null ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMap(location)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Map
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Viewer Modal */}
      {selectedLocation && (
        <MapViewerModal
          isOpen={isMapOpen}
          onClose={() => {
            setIsMapOpen(false)
            setSelectedLocation(null)
          }}
          location={selectedLocation}
        />
      )}
    </div>
  )
}

