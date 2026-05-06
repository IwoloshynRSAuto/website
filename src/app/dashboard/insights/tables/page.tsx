import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { InsightsMetricsDashboard } from '@/components/insights/insights-metrics-dashboard'
import { fetchInsightsData } from '../_data'

export const dynamic = 'force-dynamic'

export default async function InsightsTablesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const { year, vendors, hoursByCustomer, paidByCustomer, monthlyHours } = await fetchInsightsData()

  return (
    <DashboardPageShell
      title="Insights"
      description={`Data tables for ${year} (year-to-date). Use the sidebar under Insights for charts and KPIs.`}
      howTo={{
        title: 'Insights data tables',
        description: 'Same metrics as charts, in row form.',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              These tables mirror the chart views. Use <strong className="text-foreground">Metrics & charts</strong> in the sidebar for KPI cards and graphs.
            </p>
            <p>Export-friendly layout — copy or screenshot as needed.</p>
          </div>
        ),
      }}
    >
      <InsightsMetricsDashboard
        view="tables"
        year={year}
        vendors={vendors}
        hoursByCustomer={hoursByCustomer}
        paidByCustomer={paidByCustomer}
        monthlyHours={monthlyHours}
      />
    </DashboardPageShell>
  )
}
