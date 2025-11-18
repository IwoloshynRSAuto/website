import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GeolocationView } from '@/components/timekeeping/geolocation-view'

export default async function GeolocationPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Only admins and managers can access
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard/home')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Attendance Geolocation</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">View clock-in and clock-out locations</p>
      </div>

      <GeolocationView />
    </div>
  )
}

