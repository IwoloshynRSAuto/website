import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AttendanceView } from '@/components/timekeeping/attendance-view'
import { prisma } from '@/lib/prisma'

export default async function AttendancePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch users (for admin selection)
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' }
  })

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Attendance (Punch In / Punch Out)</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Track clock in and clock out times</p>
      </div>

      <AttendanceView
        currentUserId={session.user.id}
        currentUserName={session.user.name || session.user.email || ''}
        users={users}
        isAdmin={isAdmin}
      />
    </div>
  )
}

