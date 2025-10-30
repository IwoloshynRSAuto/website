'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Clock,
  Shield,
  Settings,
  Wrench,
  Code,
  ChevronDown,
  ChevronRight,
  Building2,
  Package
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Wrench },
  { name: 'Customers', href: '/dashboard/customers', icon: Building2 },
  { name: 'Time Sheets', href: '/dashboard/timekeeping', icon: Clock },
  { name: 'Parts & Services', href: '/dashboard/parts-services', icon: Package },
  { 
    name: 'Admin', 
    href: '/dashboard/admin', 
    icon: Settings,
    adminOnly: true,
    children: [
      { name: 'Labor Codes', href: '/dashboard/admin/labor-codes', icon: Code },
      { name: 'Employee Management', href: '/dashboard/admin/employees', icon: Users },
      { name: 'Timesheet Approval', href: '/dashboard/timekeeping/administrator', icon: Clock }
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      <div className="flex items-center h-16 px-6 border-b">
        <Wrench className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-xl font-bold text-gray-900">
          RS Automation Portal
        </span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.filter(item => {
          // Show admin items only to admin users
          if (item.adminOnly && session?.user?.role !== 'ADMIN') {
            return false
          }
          return true
        }).map((item) => {
          const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href))
          const hasChildren = item.children && item.children.length > 0
          
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
              
              {hasChildren && isActive && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const isChildActive = pathname === child.href
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                          isChildActive
                            ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        )}
                      >
                        <child.icon className="mr-3 h-4 w-4" />
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}