import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Briefcase, FileText, ArrowRight } from 'lucide-react'

export default async function DashboardHomePage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const displayName = session.user?.name || session.user?.email || 'there'

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
          <Link key={href} href={href} className="group block rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-blue-600">
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
    </DashboardPageShell>
  )
}
