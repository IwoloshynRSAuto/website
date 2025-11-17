'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, TrendingDown, DollarSign, Clock, Briefcase, Award } from 'lucide-react'
import Link from 'next/link'

interface CustomerMetric {
  id: string
  name: string
  thisYear: {
    hours: number
    revenue: number
    jobsCompleted: number
    quotesWon: number
    winRate: number
  }
  lastYear: {
    hours: number
    revenue: number
    jobsCompleted: number
    quotesWon: number
    winRate: number
  }
}

interface TopCustomersViewProps {
  topByRevenue: CustomerMetric[]
  topByHours: CustomerMetric[]
  topByJobs: CustomerMetric[]
  currentYear: number
  lastYear: number
}

export function TopCustomersView({
  topByRevenue,
  topByHours,
  topByJobs,
  currentYear,
  lastYear,
}: TopCustomersViewProps) {
  const getChangeIndicator = (current: number, previous: number) => {
    if (current === 0 && previous === 0) return null
    if (previous === 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    
    const change = ((current - previous) / previous) * 100
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '100%' : '0%'
    const change = ((current - previous) / previous) * 100
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="Top Customers"
        subtitle={`Performance metrics for ${currentYear} vs ${lastYear}`}
      />

      <DashboardContent>
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">
              <DollarSign className="h-4 w-4 mr-2" />
              By Revenue
            </TabsTrigger>
            <TabsTrigger value="hours">
              <Clock className="h-4 w-4 mr-2" />
              By Hours
            </TabsTrigger>
            <TabsTrigger value="jobs">
              <Briefcase className="h-4 w-4 mr-2" />
              By Jobs Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>Top Customers by Revenue ({currentYear})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">{currentYear} Revenue</TableHead>
                        <TableHead className="text-right">{lastYear} Revenue</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Jobs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topByRevenue.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No customer data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        topByRevenue.map((customer, index) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <Badge variant="outline">#{index + 1}</Badge>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/dashboard/customers/${customer.id}`}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {customer.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${customer.thisYear.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-gray-600">
                              ${customer.lastYear.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {getChangeIndicator(customer.thisYear.revenue, customer.lastYear.revenue)}
                                <span className={customer.thisYear.revenue >= customer.lastYear.revenue ? 'text-green-600' : 'text-red-600'}>
                                  {getChangePercent(customer.thisYear.revenue, customer.lastYear.revenue)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {customer.thisYear.hours.toFixed(1)} hrs
                            </TableCell>
                            <TableCell className="text-right">
                              {customer.thisYear.jobsCompleted}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle>Top Customers by Hours ({currentYear})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">{currentYear} Hours</TableHead>
                        <TableHead className="text-right">{lastYear} Hours</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Jobs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topByHours.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No customer data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        topByHours.map((customer, index) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <Badge variant="outline">#{index + 1}</Badge>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/dashboard/customers/${customer.id}`}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {customer.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {customer.thisYear.hours.toFixed(1)} hrs
                            </TableCell>
                            <TableCell className="text-right text-gray-600">
                              {customer.lastYear.hours.toFixed(1)} hrs
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {getChangeIndicator(customer.thisYear.hours, customer.lastYear.hours)}
                                <span className={customer.thisYear.hours >= customer.lastYear.hours ? 'text-green-600' : 'text-red-600'}>
                                  {getChangePercent(customer.thisYear.hours, customer.lastYear.hours)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ${customer.thisYear.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              {customer.thisYear.jobsCompleted}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle>Top Customers by Jobs Completed ({currentYear})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">{currentYear} Jobs</TableHead>
                        <TableHead className="text-right">{lastYear} Jobs</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topByJobs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No customer data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        topByJobs.map((customer, index) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <Badge variant="outline">#{index + 1}</Badge>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/dashboard/customers/${customer.id}`}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {customer.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {customer.thisYear.jobsCompleted}
                            </TableCell>
                            <TableCell className="text-right text-gray-600">
                              {customer.lastYear.jobsCompleted}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {getChangeIndicator(customer.thisYear.jobsCompleted, customer.lastYear.jobsCompleted)}
                                <span className={customer.thisYear.jobsCompleted >= customer.lastYear.jobsCompleted ? 'text-green-600' : 'text-red-600'}>
                                  {getChangePercent(customer.thisYear.jobsCompleted, customer.lastYear.jobsCompleted)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {customer.thisYear.hours.toFixed(1)} hrs
                            </TableCell>
                            <TableCell className="text-right">
                              ${customer.thisYear.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

