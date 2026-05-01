import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TimeView } from '@/components/timekeeping/time-view'
import { prisma } from '@/lib/prisma'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAllowedPhaseCodesForUser } from '@/lib/timekeeping/phase-code-access'

export default async function TimeTrackingPage() {
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

  // Fetch jobs
  const jobs = await prisma.job.findMany({
    where: {
      status: { not: 'COMPLETED' }
    },
    select: {
      id: true,
      jobNumber: true,
      title: true,
    },
    orderBy: { jobNumber: 'asc' }
  })

  // Fetch labor codes (restricted for non-admins)
  const isAdmin = session.user.role === 'ADMIN'
  const laborCodes = isAdmin
    ? await prisma.laborCode.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      })
    : await getAllowedPhaseCodesForUser(session.user.id)

  return (
    <DashboardPageShell
      title="Time (Job Time Tracking)"
      description="Track job-specific time entries"
      actions={
        isAdmin ? (
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/dashboard/timekeeping/approvals">Approve Time</Link>
          </Button>
        ) : null
      }
    >
      <TimeView
        currentUserId={session.user.id}
        currentUserName={session.user.name || session.user.email || ''}
        users={users}
        jobs={jobs}
        laborCodes={laborCodes}
        isAdmin={isAdmin}
      />
    </DashboardPageShell>
  )
}

