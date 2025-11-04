import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { CustomerDetailsEditable } from '@/components/crm/customer-details-editable'
import { CustomerDetailsPage } from '@/components/crm/customer-details-page'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CustomerDetailsPageRoute({ params }: PageProps) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      redirect('/auth/signin')
    }

    // Await params (Next.js 15+ makes params a Promise)
    const { id: customerId } = await params
    
    
    if (!customerId) {
      console.error('Customer ID is missing. Params:', params)
      notFound()
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        fileLink: true,
      }
    })

    if (!customer) {
      notFound()
    }

    // Fetch contacts, quotes, and jobs - handle errors gracefully
    let contacts = []
    let quotes = []
    let jobs = []
    
    try {
      [contacts, quotes, jobs] = await Promise.all([
        prisma.contact.findMany({
          where: { customerId: customerId },
          orderBy: { name: 'asc' },
        }).catch(() => []),
        prisma.quote.findMany({
          where: { customerId: customerId },
          include: {
            job: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }).catch(() => []),
        prisma.job.findMany({
          where: { customerId: customerId },
          select: {
            id: true,
            jobNumber: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            lastFollowUp: true,
          },
          orderBy: { createdAt: 'desc' },
        }).catch(() => []),
      ])
    } catch (error) {
      console.error('Error fetching customer data:', error)
      // Continue with empty arrays if there's an error
      contacts = []
      quotes = []
      jobs = []
    }

    // Serialize dates to strings for client component (Next.js requires serializable props)
    const serializedData = {
      customer,
      initialContacts: (contacts || []).map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        createdAt: contact.createdAt?.toISOString() || new Date().toISOString(),
      })),
      initialQuotes: (quotes || []).map(quote => ({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        status: quote.status,
        isActive: quote.isActive ?? true,
        amount: quote.amount || 0,
        createdAt: quote.createdAt?.toISOString() || new Date().toISOString(),
        lastFollowUp: quote.lastFollowUp?.toISOString() || null,
        quoteFile: quote.quoteFile || null,
        relatedJobId: quote.job?.id || null,
      })),
      initialJobs: (jobs || []).map(job => ({
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt?.toISOString() || new Date().toISOString(),
        lastFollowUp: job.lastFollowUp?.toISOString() || null,
      })),
    }

    // Calculate stats for Quick Stats card
    const contactsCount = serializedData.initialContacts.length
    const activeQuotesCount = serializedData.initialQuotes.filter(q => q.isActive).length
    const activeJobsCount = serializedData.initialJobs.filter(j => j.status === 'ACTIVE').length
    const overdueFollowUpsCount = [...serializedData.initialQuotes, ...serializedData.initialJobs].filter(item => {
      if (!item.lastFollowUp) return true
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return new Date(item.lastFollowUp) < sevenDaysAgo
    }).length

    return (
      <div className="flex flex-col">
        <CustomerDetailsEditable 
          customer={customer}
          contacts={serializedData.initialContacts.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            position: c.position || null,
          }))}
          contactsCount={contactsCount}
          activeQuotesCount={activeQuotesCount}
          activeJobsCount={activeJobsCount}
          overdueFollowUpsCount={overdueFollowUpsCount}
        />
        <div className="px-3 sm:px-4 lg:px-6 pb-6">
          <CustomerDetailsPage
            customer={serializedData.customer}
            initialContacts={serializedData.initialContacts}
            initialQuotes={serializedData.initialQuotes}
            initialJobs={serializedData.initialJobs}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error in CustomerDetailsPageRoute:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    // If customer wasn't found, show 404
    if (error instanceof Error && error.message.includes('not found')) {
      notFound()
    }
    
    // Otherwise, try to render with empty data
    return (
      <div className="flex flex-col">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Customer</h2>
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'An error occurred while loading the customer data.'}
            </p>
          </div>
        </div>
      </div>
    )
  }
}
