import { TaskCodesTable } from '@/components/admin/task-codes-table'
import { TASK_CODES } from '@/lib/task-codes'

export default async function TaskCodesPage() {
  // Import task codes automatically if database is empty
  // This will be handled client-side, but we pass the static codes as fallback
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Codes</h1>
          <p className="text-gray-600">Manage all available task codes for project management</p>
        </div>
      </div>

      <TaskCodesTable initialTaskCodes={TASK_CODES} />
    </div>
  )
}

