import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Briefcase, FileText, ArrowRight, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { QuoteService } from '@/lib/quotes/service'
import { getUpcomingJobDeadlines } from '@/lib/insights/metrics'

export const dynamic = 'force-dynamic'

export default async function DashboardHomePage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const displayName = session.user?.name || session.user?.email || 'there'

  const [upcomingJobs, agingQuotes] = await Promise.all([
    getUpcomingJobDeadlines(10),
    QuoteService.getAgingQuotes(30),
  ])

  const staleQuotes = agingQuotes.filter((q) => q.agingAlert !== 'OK').slice(0, 8)

  const tiles = [
    {
      title: 'Timekeeping',
      description: 'Attendance, time entry, and approvals.',
      href: '/dashboard/timekeeping/attendance',
      icon: Clock,
    },
    {
      title: 'Jobs',
      description: 'Browse and manage jobs.',
      href: '/dashboard/jobs',
      icon: Briefcase,
    },
    {
      title: 'Quotes',
      description: 'Quotes pipeline and conversions.',
      href: '/dashboard/jobs/quotes',
      icon: FileText,
    },
  ]

  return (
    <DashboardPageShell
      title="Home"
      description={`Welcome back, ${displayName}. Choose an area below or use the sidebar.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group block rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Card className="h-full border border-border transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                  Open
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Next job deadlines</CardTitle>
            <Link href="/dashboard/scheduling" className="text-sm font-medium text-blue-600 hover:underline">
              Schedule
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active jobs to show.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingJobs.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/dashboard/jobs/${j.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-border hover:bg-muted/40"
                    >
                      <span className="font-medium text-foreground">
                        {j.jobNumber}
                        <span className="ml-2 font-normal text-muted-foreground">{j.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {j.overdue ? (
                          <Badge variant="destructive" className="text-xs">
                            Overdue
                          </Badge>
                        ) : null}
                        {j.endDate ? (
                          <span className="text-muted-foreground">{format(j.endDate, 'MMM d, yyyy')}</span>
                        ) : (
                          <span className="text-muted-foreground">No end date</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
              Quotes needing follow-up
            </CardTitle>
            <Link href="/dashboard/jobs/quotes" className="text-sm font-medium text-blue-600 hover:underline">
              All quotes
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Draft or sent quotes that are stale (no update in 30 days) or past their valid-until date.
            </p>
            {staleQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No aging alerts right now.</p>
            ) : (
              <ul className="space-y-2">
                {staleQuotes.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/dashboard/jobs/quotes/${q.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-border hover:bg-muted/40"
                    >
                      <span className="font-medium">{q.quoteNumber || q.id.slice(0, 8)}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {q.isExpired ? (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Stale {q.daysSinceUpdate}d
                          </Badge>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/dashboard/insights/metrics" className="font-medium text-blue-600 hover:underline">
          Insights
        </Link>{' '}
        ·{' '}
        <Link href="/dashboard/my-work" className="font-medium text-blue-600 hover:underline">
          My work
        </Link>
      </p>
    </DashboardPageShell>
  )
}
