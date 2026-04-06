'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { User, LogOut, Menu, X, ArrowLeft } from 'lucide-react'
import { Sidebar } from './sidebar'

interface HeaderProps {
  user: {
    name?: string | null
    email: string
    role: string
  }
}

export function Header({ user }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <header className="bg-background shadow-sm border-b border-border sticky top-0 z-40 h-16">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Mobile menu button */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden flex-shrink-0"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden sm:inline-flex items-center gap-1 shadow-sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Back
            </Button>
            
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm lg:text-lg font-semibold text-foreground truncate">
                <span className="hidden sm:inline">Welcome, </span>
                {user.name || user.email}
              </h2>
              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full flex-shrink-0">
                {user.role}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
            <div className="hidden lg:flex items-center space-x-2">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-32">{user.email}</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="hidden sm:flex text-xs sm:text-sm"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
            
            {/* Mobile sign out button */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="sm:hidden"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-background shadow-lg">
            <Sidebar />
          </div>
        </div>
      )}
    </>
  )
}


