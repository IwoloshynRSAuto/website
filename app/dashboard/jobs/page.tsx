import React, { Suspense } from 'react'
import { JobsQuotesTabs } from '@/components/jobs/jobs-quotes-tabs'
import { MultiSOPButton } from '@/components/common/multi-sop-button'
import { SOPS } from '@/lib/sops'
import { CreateJobButton } from '@/components/jobs/create-job-button'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Jobs only (project numbers use an E prefix). Use <span className="font-medium text-gray-800">Work → Quotes</span> for the quote pipeline.
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <JobsQuotesTabs
          jobsOnly
          headerButtons={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <MultiSOPButton 
                sops={[SOPS.CREATE_QUOTE, SOPS.CONVERT_QUOTE]}
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-6"
              />
              <CreateJobButton />
            </div>
          }
        />
      </Suspense>
    </div>
  )
}
