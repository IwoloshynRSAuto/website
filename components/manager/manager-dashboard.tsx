'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Clock,
  Calendar,
  DollarSign,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  ArrowRight,
  Code,
  Database,
} from 'lucide-react'
import { DataManagement } from '@/components/admin/data-management'

interface AdminDashboardProps {
  stats: {
    pendingTimesheets: number
    pendingPTO: number
    pendingExpenses: number
    pendingTimeChanges: number
    totalJobs: number
    activeJobs: number
    totalPending: number
  }
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Overview of team metrics, pending approvals, and system management
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Pending Approvals</div>
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold">{stats.totalPending}</div>
            <div className="text-xs text-gray-500 mt-1">Requires action</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Active Jobs</div>
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold">{stats.activeJobs}</div>
            <div className="text-xs text-gray-500 mt-1">of {stats.totalJobs} total</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Pending PTO</div>
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold">{stats.pendingPTO}</div>
            <div className="text-xs text-gray-500 mt-1">Time off requests</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Pending Expenses</div>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold">{stats.pendingExpenses}</div>
            <div className="text-xs text-gray-500 mt-1">Expense reports</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access - Approval Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access - Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/timekeeping/approvals/attendance">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-6 w-6 text-blue-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Timesheet Approvals</h3>
                      <p className="text-sm text-gray-600">{stats.pendingTimesheets} pending</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/timekeeping/approvals/time-changes">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Attendance Approvals</h3>
                      <p className="text-sm text-gray-600">{stats.pendingTimeChanges} pending</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/home/approvals/pto">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-6 w-6 text-green-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">PTO Approvals</h3>
                      <p className="text-sm text-gray-600">{stats.pendingPTO} pending</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/home/approvals/expense">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Expense Approvals</h3>
                      <p className="text-sm text-gray-600">{stats.pendingExpenses} pending</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Management Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Management Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/dashboard/admin/employees">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Employee Management</h3>
                      <p className="text-sm text-gray-600">Manage team members</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/metrics">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Metrics & Analytics</h3>
                      <p className="text-sm text-gray-600">View detailed reports</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/admin/labor-codes">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Code className="h-5 w-5 text-purple-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Labor Codes</h3>
                      <p className="text-sm text-gray-600">Manage labor codes</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <DataManagement />
    </div>
  )
}

