import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { InsightsMetricsDashboard } from '@/components/insights/insights-metrics-dashboard'
import { fetchInsightsData } from '../_data'

export const dynamic = 'force-dynamic'

export default async function InsightsMetricsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const { year, vendors, hoursByCustomer, paidByCustomer, monthlyHours } = await fetchInsightsData()

  return (
    <DashboardPageShell
      title="Insights"
      description={`Metrics & charts for ${year} (year-to-date). Use the sidebar under Insights for data tables.`}
      howTo={{
        title: 'How to use Insights',
        description: 'Vendor spend, customer labor, and milestone signals.',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Switch between <strong className="text-foreground">Metrics & charts</strong> and{' '}
              <strong className="text-foreground">Data tables</strong> from the left sidebar (same pattern as Jobs & Quotes).
            </p>
            <p>
              <strong className="text-foreground">Vendor spend</strong> sums PO totals this year (excluding cancelled).
            </p>
            <p>
              <strong className="text-foreground">Billable hours</strong> come from billable TimeEntry rows on jobs (customer rolled up from the job).
            </p>
            <p>
              <strong className="text-foreground">Paid milestones</strong> are billing milestones marked PAID (updated this year).
            </p>
          </div>
        ),
      }}
    >
      <InsightsMetricsDashboard
        view="metrics"
        year={year}
        vendors={vendors}
        hoursByCustomer={hoursByCustomer}
        paidByCustomer={paidByCustomer}
        monthlyHours={monthlyHours}
      />
    </DashboardPageShell>
  )
}
