'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { format } from 'date-fns'

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

interface MapViewerModalProps {
  isOpen: boolean
  onClose: () => void
  location: AttendanceLocation
}

export function MapViewerModal({ isOpen, onClose, location }: MapViewerModalProps) {
  // Generate Google Maps embed URL
  const googleMapsEmbedUrl = location.lat && location.lon
    ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6d-s6Y4c3b9yXtg&q=${location.lat},${location.lon}&zoom=15`
    : null

  // Generate static map image URL (using OpenStreetMap via staticmap.org)
  const staticMapUrl = location.lat && location.lon
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${location.lat},${location.lon}&zoom=15&size=600x400&markers=${location.lat},${location.lon},red-pushpin`
    : null

  if (location.locationDenied) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Location Not Available</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Location permission was denied for this {location.type.toLowerCase()}.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              <p><strong>Employee:</strong> {location.userName}</p>
              <p><strong>Date:</strong> {format(new Date(location.date), 'MMM d, yyyy')}</p>
              <p><strong>Time:</strong> {format(new Date(location.time), 'h:mm a')}</p>
            </div>
          </div>
          <Button onClick={onClose} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    )
  }

  if (!location.lat || !location.lon) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No Location Data</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <p className="text-gray-600">No location data available for this event.</p>
          </div>
          <Button onClick={onClose} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {location.type} Location - {location.userName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Location Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Date:</span>{' '}
              {format(new Date(location.date), 'MMM d, yyyy')}
            </div>
            <div>
              <span className="font-medium">Time:</span>{' '}
              {format(new Date(location.time), 'h:mm a')}
            </div>
            <div>
              <span className="font-medium">Coordinates:</span>{' '}
              {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
            </div>
            {location.accuracy && (
              <div>
                <span className="font-medium">Accuracy:</span>{' '}
                {Math.round(location.accuracy)} meters
              </div>
            )}
          </div>

          {/* Map Container */}
          <div className="border rounded-lg overflow-hidden">
            {staticMapUrl ? (
              <div className="relative" style={{ height: '500px', width: '100%' }}>
                <img
                  src={staticMapUrl}
                  alt="Location map"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if static map fails
                    const target = e.target as HTMLImageElement
                    target.src = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${location.lon},${location.lat})/${location.lon},${location.lat},15,0/600x400?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`
                  }}
                />
                {/* Marker overlay */}
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ marginTop: '-20px' }}
                >
                  <MapPin className="h-10 w-10 text-red-600" fill="currentColor" />
                </div>
              </div>
            ) : (
              <div className="h-[500px] flex items-center justify-center bg-gray-100 text-gray-500">
                Map unavailable
              </div>
            )}
          </div>

          {/* Google Maps Link */}
          <div className="flex justify-center">
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              Open in Google Maps →
            </a>
          </div>
        </div>
        <Button onClick={onClose} className="w-full mt-4">Close</Button>
      </DialogContent>
    </Dialog>
  )
}

