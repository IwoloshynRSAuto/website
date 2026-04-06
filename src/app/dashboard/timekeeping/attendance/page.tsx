import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AttendanceView } from '@/components/timekeeping/attendance-view'
import { prisma } from '@/lib/prisma'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'

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
    <DashboardPageShell
      title="Attendance (Punch In / Punch Out)"
      description="Track clock in and clock out times"
    >
      <AttendanceView
        currentUserId={session.user.id}
        currentUserName={session.user.name || session.user.email || ''}
        users={users}
        isAdmin={isAdmin}
      />
    </DashboardPageShell>
  )
}

