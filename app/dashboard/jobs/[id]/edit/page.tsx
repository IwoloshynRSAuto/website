import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { JobEditForm } from '@/components/jobs/job-edit-form'

interface JobEditPageProps {
  params: {
    id: string
  }
}

export default async function JobEditPage({ params }: JobEditPageProps) {
  // Check authentication and admin role
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  // Fetch job data
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: true,
      createdBy: true,
      customer: true,
    }
  })

  if (!job) {
    redirect('/dashboard/jobs')
  }

  // Fetch users for assignment dropdown
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  // Fetch customers for customer dropdown
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      isActive: true,
    },
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Job</h1>
        <p className="text-gray-600">{job.jobNumber} - {job.title}</p>
      </div>

      <JobEditForm 
        job={job} 
        users={users}
        customers={customers}
      />
    </div>
  )
}
