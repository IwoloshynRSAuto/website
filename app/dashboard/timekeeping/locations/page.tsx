import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AttendanceLocationsPage } from '@/components/timekeeping/attendance-locations-page'

export const dynamic = 'force-dynamic'

export default async function AttendanceLocationsPageRoute() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Only admins and managers can access
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard/home')
  }

  return <AttendanceLocationsPage />
}

