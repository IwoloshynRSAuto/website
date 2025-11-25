import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EbaySettings } from '@/components/ebay/ebay-settings'

export const dynamic = 'force-dynamic'

export default async function EbaySettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return <EbaySettings />
}

