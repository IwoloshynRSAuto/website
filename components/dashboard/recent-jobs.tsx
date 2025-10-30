import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface Job {
  id: string
  jobNumber: string
  title: string
  status: string
  assignedTo?: {
    name: string | null
  } | null
  updatedAt: Date
}

interface RecentJobsProps {
  jobs: Job[]
}

export function RecentJobs({ jobs }: RecentJobsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'ON_HOLD':
        return 'bg-orange-100 text-orange-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                  <span className="font-medium text-sm truncate">{job.jobNumber}</span>
                  <Badge className={`${getStatusColor(job.status)} w-fit`}>
                    {job.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1 truncate">{job.title}</p>
                {job.assignedTo && job.assignedTo.name && (
                  <p className="text-xs text-gray-500 truncate">
                    Assigned to: {job.assignedTo.name}
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-2 sm:mt-0 sm:ml-4">
                {format(new Date(job.updatedAt), 'MMM d')}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}