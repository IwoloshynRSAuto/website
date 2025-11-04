import React from 'react'
import { prisma } from '@/lib/prisma'
import { CreateJobButton } from '@/components/jobs/create-job-button'
import { JobsTableStandard } from '@/components/jobs/jobs-table-standard'
import { MultiSOPButton } from '@/components/common/multi-sop-button'
import { SOPS } from '@/lib/sops'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  // Fetch real data from database with cache-busting
  const jobs = await prisma.job.findMany({
    include: {
      assignedTo: true,
      createdBy: true,
      customer: true,
      _count: {
        select: {
          timeEntries: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Convert Decimal fields to numbers for client compatibility
  const jobsResponse = jobs.map(job => ({
    ...job,
    estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null,
    actualHours: job.actualHours ? Number(job.actualHours) : null,
    estimatedCost: job.estimatedCost ? Number(job.estimatedCost) : null,
    dueTodayPercent: job.dueTodayPercent ? Number(job.dueTodayPercent) : null
  }))

  // Calculate stats
  const totalJobs = jobsResponse.filter(j => j.type === 'JOB').length
  const totalQuotes = jobsResponse.filter(j => j.type === 'QUOTE').length
  const activeJobs = jobsResponse.filter(j => j.status === 'ACTIVE' && j.type === 'JOB').length
  const completedJobs = jobsResponse.filter(j => j.status === 'COMPLETED').length
  const totalHours = jobsResponse.reduce((sum, j) => sum + (j.estimatedHours || 0), 0)

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage active projects, timelines, and job progress</p>
        </div>
      </div>

      {/* Job Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Active Jobs</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Pending Quotes</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalQuotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Completed</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{completedJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalHours.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <JobsTableStandard 
          jobs={jobsResponse}
          headerButtons={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <MultiSOPButton 
                sops={[SOPS.CREATE_QUOTE, SOPS.CONVERT_QUOTE]}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              />
              <CreateJobButton />
            </div>
          }
        />
      </div>
    </div>
  )
}