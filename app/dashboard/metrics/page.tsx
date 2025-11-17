import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { authorize } from '@/lib/auth/authorization'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { BarChart3, TrendingUp, Wrench, FileText, ArrowRight } from 'lucide-react'

export default async function MetricsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  if (!authorize(session.user, 'read', 'analytics')) {
    redirect('/dashboard/home')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Metrics & Analytics</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">View comprehensive metrics and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/metrics/employee">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border hover:border-blue-200 h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Employee Metrics</h3>
                  <p className="text-sm text-gray-600">Hours, productivity, accuracy</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/metrics/job">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border hover:border-green-200 h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Wrench className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Job Metrics</h3>
                  <p className="text-sm text-gray-600">Profitability, variance, schedule</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/metrics/quote">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border hover:border-amber-200 h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <FileText className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Quote Metrics</h3>
                  <p className="text-sm text-gray-600">Win/loss, profitability, turnaround</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

