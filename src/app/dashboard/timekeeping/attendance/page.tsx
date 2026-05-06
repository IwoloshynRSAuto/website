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
      howTo={{
        title: 'Attendance — how it works',
        description: 'Clock in/out daily, then submit the week for approval to lock it for review.',
        content: (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-foreground">
            <div className="font-semibold mb-1">Quick guide</div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Use <span className="font-medium text-foreground">Clock In Now</span> /{' '}
                <span className="font-medium text-foreground">Clock Out Now</span> for today.
              </li>
              <li>
                Click a day to view entries. Past days use <span className="font-medium text-foreground">Request Change</span>.
              </li>
              <li>
                In Week view, use <span className="font-medium text-foreground">Submit for Approval</span> to lock the week for review.
              </li>
            </ul>
          </div>
        ),
      }}
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

