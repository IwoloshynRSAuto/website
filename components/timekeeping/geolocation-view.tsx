'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { MapPin, Calendar, Clock, User, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

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

export function GeolocationView() {
  const { toast } = useToast()
  const [locations, setLocations] = useState<GeolocationEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<GeolocationEntry | null>(null)

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/timesheets/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data.data || [])
      } else {
        throw new Error('Failed to load geolocation data')
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading geolocation data...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Attendance Geolocation Data
          </CardTitle>
          <CardDescription>
            View clock-in and clock-out locations for all employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No geolocation data available. Geolocation is captured when employees clock in/out.
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{location.userName}</div>
                          <div className="text-sm text-gray-500">{location.userEmail}</div>
                        </div>
                      </TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLocation && (
        <Card>
          <CardHeader>
            <CardTitle>Location Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Employee:</strong> {selectedLocation.userName} ({selectedLocation.userEmail})
              </div>
              <div>
                <strong>Type:</strong> {selectedLocation.type}
              </div>
              <div>
                <strong>Date:</strong> {format(new Date(selectedLocation.date), 'MMM dd, yyyy')}
              </div>
              <div>
                <strong>Time:</strong> {format(new Date(selectedLocation.time), 'h:mm a')}
              </div>
              <div>
                <strong>Coordinates:</strong> {selectedLocation.lat}, {selectedLocation.lon}
              </div>
              {selectedLocation.accuracy && (
                <div>
                  <strong>Accuracy:</strong> {Math.round(selectedLocation.accuracy)} meters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

