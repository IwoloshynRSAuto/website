import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EbayDashboard } from '@/components/ebay/ebay-dashboard'

export const dynamic = 'force-dynamic'

export default async function EbayPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return <EbayDashboard />
}


