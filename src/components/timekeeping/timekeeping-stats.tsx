'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, DollarSign, Users, CheckCircle } from 'lucide-react'

interface TimekeepingStatsProps {
  totalHours: number
  billableHours: number
  totalValue: number
  uniqueUsers: number
}

export function TimekeepingStats({
  totalHours,
  billableHours,
  totalValue,
  uniqueUsers
}: TimekeepingStatsProps) {
  const billablePercentage = totalHours > 0 ? (billableHours / totalHours) * 100 : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
          </div>
          <div className="ml-3 lg:ml-4">
            <p className="text-xs lg:text-sm font-medium text-gray-600">Total Hours</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
          </div>
          <div className="ml-3 lg:ml-4">
            <p className="text-xs lg:text-sm font-medium text-gray-600">Billable Hours</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{billableHours.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
          </div>
          <div className="ml-3 lg:ml-4">
            <p className="text-xs lg:text-sm font-medium text-gray-600">Total Value</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Users className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" />
          </div>
          <div className="ml-3 lg:ml-4">
            <p className="text-xs lg:text-sm font-medium text-gray-600">Active Users</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{uniqueUsers}</p>
          </div>
        </div>
      </div>
    </div>
  )
}





