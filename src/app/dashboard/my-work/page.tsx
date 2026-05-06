import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function MyWorkPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')

  const userId = session.user.id

  const [tasks, deliverables, machineBookings] = await Promise.all([
    prisma.taskCard.findMany({
      where: {
        assignedToId: userId,
        status: { not: 'COMPLETED' },
      },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      take: 40,
      include: {
        job: { select: { id: true, jobNumber: true, title: true } },
        quote: { select: { id: true, quoteNumber: true, title: true } },
      },
    }),
    prisma.jobDeliverable.findMany({
      where: {
        assignedToId: userId,
        status: { notIn: ['COMPLETED', 'DELIVERED', 'ACCEPTED'] },
      },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      take: 40,
      include: {
        job: { select: { id: true, jobNumber: true, title: true } },
      },
    }),
    prisma.machineShopAssignment.findMany({
      where: {
        userId,
        plannedEnd: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { plannedStart: 'asc' },
      take: 20,
      include: {
        machine: { select: { name: true } },
        job: { select: { id: true, jobNumber: true, title: true } },
      },
    }),
  ])

  return (
    <DashboardPageShell
      title="My work"
      description="Tasks, deliverables, and upcoming machine shop bookings assigned to you."
      howTo={{
        title: 'My work',
        description: 'Assignments pulled from jobs and quotes.',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Tasks</strong> come from job/quote task cards where you are the assignee.
            </p>
            <p>
              <strong className="text-foreground">Deliverables</strong> are job deliverables assigned to you (excluding completed states).
            </p>
            <p>
              <strong className="text-foreground">Machine shop</strong> lists bookings where you are the assigned operator and the slot ends after yesterday.
            </p>
            <p>PTO and company-wide calendars are not consolidated here yet — use Attendance and Scheduling for clock and shop visibility.</p>
          </div>
        ),
      }}
    >
      <div className="space-y-6">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Assigned tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks assigned to you.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border px-3 py-2">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.job ? (
                            <Link href={`/dashboard/jobs/${t.job.id}`} className="hover:underline">
                              {t.job.jobNumber} · {t.job.title}
                            </Link>
                          ) : t.quote ? (
                            <Link href={`/dashboard/jobs/quotes/${t.quote.id}`} className="hover:underline">
                              {t.quote.quoteNumber || 'Quote'} · {t.quote.title || ''}
                            </Link>
                          ) : (
                            'No linked job or quote'
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="secondary">{t.status}</Badge>
                        {t.dueDate ? (
                          <span className="text-xs text-muted-foreground">Due {format(t.dueDate, 'MMM d')}</span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Deliverables</CardTitle>
          </CardHeader>
          <CardContent>
            {deliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active deliverables assigned to you.</p>
            ) : (
              <ul className="space-y-2">
                {deliverables.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/dashboard/jobs/${d.job.id}`}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-transparent px-3 py-2 hover:border-border hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.job.jobNumber} · {d.job.title}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="outline">{d.status}</Badge>
                        {d.dueDate ? (
                          <span className="text-xs text-muted-foreground">Due {format(d.dueDate, 'MMM d')}</span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Machine shop bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {machineBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming machine bookings assigned to you.</p>
            ) : (
              <ul className="space-y-2">
                {machineBookings.map((b) => (
                  <li key={b.id}>
                    <Link
                      href="/dashboard/scheduling/machine-shop"
                      className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-transparent px-3 py-2 hover:border-border hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-medium">{b.machine.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.job.jobNumber} · {b.job.title}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(b.plannedStart, 'MMM d HH:mm')} – {format(b.plannedEnd, 'MMM d HH:mm')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  )
}
