import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Users, Clock, AlertTriangle, TrendingUp, Activity } from 'lucide-react'

interface DashboardStatsProps {
  totalJobs: number
  activeJobs: number
  totalEmployees: number
  totalCustomers: number
  overdueInvoices: number
}

export function DashboardStats({
  totalJobs,
  activeJobs,
  totalEmployees,
  totalCustomers,
  overdueInvoices
}: DashboardStatsProps) {
  const stats = [
    {
      title: 'Total Jobs',
      value: totalJobs,
      icon: FolderOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'All projects & quotes'
    },
    {
      title: 'Active Jobs',
      value: activeJobs,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Currently in progress'
    },
    {
      title: 'Employees',
      value: totalEmployees,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Team members'
    },
    {
      title: 'Active Customers',
      value: totalCustomers,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Client accounts'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title} className={`${stat.bgColor} ${stat.borderColor} border-2 hover:shadow-lg transition-all duration-300`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor} border ${stat.borderColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value.toLocaleString()}</div>
            <p className="text-xs text-gray-600">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}