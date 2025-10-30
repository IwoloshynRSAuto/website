import { prisma } from '@/lib/prisma'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentJobs } from '@/components/dashboard/recent-jobs'
import { UpcomingDueDates } from '@/components/dashboard/upcoming-due-dates'
import { MultiSOPButton } from '@/components/common/multi-sop-button'
import { SOPS } from '@/lib/sops'
import { DashboardPageContainer, DashboardHeader, DashboardContent, DashboardGrid } from '@/components/layout/dashboard-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench, Clock, Users, Building2, TrendingUp, Calendar, ArrowRight, Activity, AlertTriangle, CheckCircle, Plus, BarChart3, Target, Zap } from 'lucide-react'
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
      include: {
        assignedTo: true,
        customer: true
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
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 mb-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Welcome to RS Automation Portal</h1>
            <p className="text-blue-100 text-lg">Your central hub for project management, time tracking, and customer relations</p>
          </div>
          <div className="flex-shrink-0">
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
              variant="outline"
              size="default"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            />
          </div>
        </div>
      </div>

      <DashboardContent>
        {/* Enhanced Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
            <Badge variant="outline" className="text-sm">
              <Zap className="h-4 w-4 mr-1" />
              Fast Access
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/dashboard/jobs">
              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6 text-center">
                  <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Wrench className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Jobs</h3>
                  <p className="text-gray-600 mb-3">Manage projects & quotes</p>
                  <div className="flex items-center justify-center text-blue-600 text-sm font-medium">
                    <span>View Jobs</span>
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/timekeeping">
              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-6 text-center">
                  <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Time Sheets</h3>
                  <p className="text-gray-600 mb-3">Track hours & productivity</p>
                  <div className="flex items-center justify-center text-green-600 text-sm font-medium">
                    <span>Track Time</span>
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/customers">
              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-6 text-center">
                  <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Customers</h3>
                  <p className="text-gray-600 mb-3">View client information</p>
                  <div className="flex items-center justify-center text-purple-600 text-sm font-medium">
                    <span>View Clients</span>
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/parts-services">
              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-6 text-center">
                  <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Parts & Services</h3>
                  <p className="text-gray-600 mb-3">Manage inventory</p>
                  <div className="flex items-center justify-center text-orange-600 text-sm font-medium">
                    <span>View Inventory</span>
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Enhanced Stats Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
            <Badge variant="outline" className="text-sm">
              <BarChart3 className="h-4 w-4 mr-1" />
              Live Data
            </Badge>
          </div>
          <DashboardStats 
            totalJobs={totalJobs}
            activeJobs={activeJobs}
            totalEmployees={totalEmployees}
            totalCustomers={totalCustomers}
            overdueInvoices={overdueJobs}
          />
        </div>

        {/* Enhanced Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Recent Jobs */}
          <div className="xl:col-span-2">
            <RecentJobs jobs={recentJobs} />
          </div>
          
          {/* Right Column - Sidebar Cards */}
          <div className="space-y-6">
            {/* Upcoming Due Dates */}
            <UpcomingDueDates jobs={allJobs} />
            
            {/* System Status Card */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Activity className="h-5 w-5 mr-2 text-green-600" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Active Projects</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 font-bold">{activeJobs}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Team Members</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 font-bold">{totalEmployees}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Active Customers</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800 font-bold">{totalCustomers}</Badge>
                  </div>
                  
                  {overdueJobs > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Overdue Jobs</span>
                      </div>
                      <Badge className="bg-red-100 text-red-800 font-bold">{overdueJobs}</Badge>
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t">
                  <Link href="/dashboard/jobs">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Target className="h-4 w-4 mr-2" />
                      View All Jobs
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{totalJobs}</div>
                    <div className="text-sm text-gray-600">Total Jobs</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{activeJobs}</div>
                      <div className="text-xs text-gray-600">Active</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{totalEmployees}</div>
                      <div className="text-xs text-gray-600">Employees</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}
