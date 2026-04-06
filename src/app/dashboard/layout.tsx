import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar - fixed */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Main content area with margin for fixed sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 lg:ml-[260px]">
        <Header user={session.user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background min-h-0">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


