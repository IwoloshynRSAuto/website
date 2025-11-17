import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CustomerService } from '@/lib/customers/service'
import { TopCustomersView } from '@/components/customers/top-customers-view'

export const dynamic = 'force-dynamic'

export default async function TopCustomersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const currentYear = new Date().getFullYear()
  const lastYear = currentYear - 1

  // Get all customers with their metrics
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    include: {
      jobs: {
        where: {
          createdAt: {
            gte: new Date(`${lastYear}-01-01`),
          },
        },
        include: {
          timeEntries: {
            include: {
              laborCode: true,
            },
          },
        },
      },
      quotes: {
        where: {
          createdAt: {
            gte: new Date(`${lastYear}-01-01`),
          },
        },
      },
    },
  })

  // Calculate metrics for each customer
  const customerMetrics = await Promise.all(
    customers.map(async (customer) => {
      const thisYearMetrics = await CustomerService.getCustomerMetrics(customer.id, currentYear)
      const lastYearMetrics = await CustomerService.getCustomerMetrics(customer.id, lastYear)

      return {
        id: customer.id,
        name: customer.name,
        thisYear: {
          hours: thisYearMetrics.totalHours,
          revenue: thisYearMetrics.totalRevenue,
          jobsCompleted: thisYearMetrics.jobsCompleted,
          quotesWon: thisYearMetrics.quotesWon,
          winRate: thisYearMetrics.winRate,
        },
        lastYear: {
          hours: lastYearMetrics.totalHours,
          revenue: lastYearMetrics.totalRevenue,
          jobsCompleted: lastYearMetrics.jobsCompleted,
          quotesWon: lastYearMetrics.quotesWon,
          winRate: lastYearMetrics.winRate,
        },
      }
    })
  )

  // Sort by revenue (this year)
  const sortedByRevenue = [...customerMetrics].sort((a, b) => b.thisYear.revenue - a.thisYear.revenue)
  const sortedByHours = [...customerMetrics].sort((a, b) => b.thisYear.hours - a.thisYear.hours)
  const sortedByJobs = [...customerMetrics].sort((a, b) => b.thisYear.jobsCompleted - a.thisYear.jobsCompleted)

  return (
    <TopCustomersView
      topByRevenue={sortedByRevenue.slice(0, 10)}
      topByHours={sortedByHours.slice(0, 10)}
      topByJobs={sortedByJobs.slice(0, 10)}
      currentYear={currentYear}
      lastYear={lastYear}
    />
  )
}

