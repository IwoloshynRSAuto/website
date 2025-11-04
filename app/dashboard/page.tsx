import { prisma } from '@/lib/prisma'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentJobs } from '@/components/dashboard/recent-jobs'
import { UpcomingDueDates } from '@/components/dashboard/upcoming-due-dates'
import { FollowUpsSection } from '@/components/crm/follow-ups-section'
import { MultiSOPButton } from '@/components/common/multi-sop-button'
import { SOPS } from '@/lib/sops'
import { DashboardPageContainer, DashboardHeader, DashboardContent, DashboardGrid } from '@/components/layout/dashboard-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench, Clock, Users, Building2, TrendingUp, Calendar, ArrowRight, Activity, AlertTriangle, CheckCircle, Plus, BarChart3, Target, Zap, Package } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  // Fetch real data from database
  const [
    totalJobs,
    activeJobs,
    totalEmployees,
    totalCustomers,
    recentJobs,
    allJobs,
    overdueJobs
  ] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.job.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        assignedTo: true,
        customer: true
      }
    }),
    prisma.job.findMany({
      select: {
        id: true,
        jobNumber: true,
        title: true,
        endDate: true,
        status: true,
        priority: true,
        updatedAt: true,
        assignedTo: {
          select: {
            name: true
          }
        },
        customer: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.job.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          lt: new Date()
        }
      }
    })
  ])

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="Dashboard"
        subtitle="Overview of your projects, time tracking, and customer relations"
      >
        <MultiSOPButton 
          sops={[
            SOPS.CREATE_QUOTE, 
            SOPS.CONVERT_QUOTE, 
            SOPS.ADD_EMPLOYEE,
            SOPS.ADD_CUSTOMER,
            SOPS.ADD_TIME_ENTRY, 
            SOPS.VALIDATE_TRACKING, 
            SOPS.BILLING_MILESTONE
          ]}
          buttonText="How To Guides"
        />
      </DashboardHeader>

      <DashboardContent>
        {/* Stats Overview */}
        <DashboardStats 
          totalJobs={totalJobs}
          activeJobs={activeJobs}
          totalEmployees={totalEmployees}
          totalCustomers={totalCustomers}
          overdueInvoices={overdueJobs}
        />

        {/* Quick Actions */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/jobs">
              <Card className="group hover:shadow-lg transition-shadow cursor-pointer border hover:border-blue-200 h-full">
                <CardContent className="p-4 sm:p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Wrench className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">Jobs</h3>
                      <p className="text-sm text-gray-600">Manage projects & quotes</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/parts">
              <Card className="group hover:shadow-lg transition-shadow cursor-pointer border hover:border-purple-200 h-full">
                <CardContent className="p-4 sm:p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">Parts Dashboard</h3>
                      <p className="text-sm text-gray-600">Manage parts & inventory</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/customers">
              <Card className="group hover:shadow-lg transition-shadow cursor-pointer border hover:border-teal-200 h-full">
                <CardContent className="p-4 sm:p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                      <Building2 className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">Customers</h3>
                      <p className="text-sm text-gray-600">View client information</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/timekeeping">
              <Card className="group hover:shadow-lg transition-shadow cursor-pointer border hover:border-orange-200 h-full">
                <CardContent className="p-4 sm:p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                      <Clock className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">Time Sheets</h3>
                      <p className="text-sm text-gray-600">Track hours & productivity</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Recent Jobs */}
          <div className="xl:col-span-2">
            <RecentJobs jobs={recentJobs} />
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Follow-ups Section - CRM */}
            <FollowUpsSection />
            
            {/* Upcoming Due Dates */}
            <UpcomingDueDates jobs={allJobs} />
          </div>
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}
