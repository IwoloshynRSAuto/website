import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataManagement } from '@/components/admin/data-management'
import { Code, Users, Clock } from 'lucide-react'
import { DashboardPageContainer, DashboardHeader, DashboardContent, DashboardGrid, DashboardCard } from '@/components/layout/dashboard-page'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }
  return (
    <DashboardPageContainer>
      <DashboardHeader 
        title="Admin Panel"
        subtitle="Manage system settings and configurations"
      />

      <DashboardContent>
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/admin/labor-codes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-600" />
                Labor Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Manage labor codes for time tracking and billing
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/employees">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Employee Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Manage employee information, positions, and wages
              </p>
            </CardContent>
          </Card>
        </Link>


        <Link href="/dashboard/timekeeping/administrator">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Timesheet Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Review and approve employee timesheet submissions
              </p>
            </CardContent>
          </Card>
        </Link>

        </DashboardGrid>

        {/* Data Management Section */}
        <div className="mt-6">
          <DataManagement />
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}


