'use client'

import { useEffect } from 'react'
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
  Package,
  Database,
  Box,
  Search,
  FileText
} from 'lucide-react'

import { MODULE_COLORS } from '@/lib/dashboard-styles'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Wrench },
  { 
    name: 'Parts', 
    href: '/dashboard/parts', 
    icon: Package,
    children: [
      { name: 'Parts Database', href: '/dashboard/parts/database', icon: Database },
      { name: 'Packages / Assemblies', href: '/dashboard/parts/packages', icon: Box },
      { name: 'BOM', href: '/dashboard/parts/boms', icon: Package },
    ]
  },
  { name: 'Customers', href: '/dashboard/customers', icon: Building2 },
  { name: 'Time Sheets', href: '/dashboard/timekeeping', icon: Clock, module: 'timesheets' },
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

  // No automatic session refresh - let SessionProvider handle it
  // Removed periodic session fetching to prevent unnecessary reloads

  // Determine module color classes based on pathname
  const getModuleClasses = (href: string) => {
    if (href.includes('/timekeeping') || href.includes('/timesheets')) {
      return {
        active: 'bg-orange-100 text-orange-700 border-l-2 border-orange-500',
        icon: 'text-orange-500',
        childActive: 'bg-orange-50 text-orange-600 border-l-2 border-orange-500',
      }
    }
    if (href.includes('/jobs')) {
      return {
        active: 'bg-blue-100 text-blue-700 border-l-2 border-blue-600',
        icon: 'text-blue-600',
        childActive: 'bg-blue-50 text-blue-600 border-l-2 border-blue-600',
      }
    }
    if (href.includes('/customers') || href.includes('/crm')) {
      return {
        active: 'bg-teal-100 text-teal-700 border-l-2 border-teal-600',
        icon: 'text-teal-600',
        childActive: 'bg-teal-50 text-teal-600 border-l-2 border-teal-600',
      }
    }
    if (href.includes('/parts')) {
      return {
        active: 'bg-purple-100 text-purple-700 border-l-2 border-purple-600',
        icon: 'text-purple-600',
        childActive: 'bg-purple-50 text-purple-600 border-l-2 border-purple-600',
      }
    }
    if (href.includes('/quotes')) {
      return {
        active: 'bg-amber-100 text-amber-700 border-l-2 border-amber-600',
        icon: 'text-amber-600',
        childActive: 'bg-amber-50 text-amber-600 border-l-2 border-amber-600',
      }
    }
    if (href.includes('/admin')) {
      return {
        active: 'bg-slate-100 text-slate-700 border-l-2 border-slate-600',
        icon: 'text-slate-600',
        childActive: 'bg-slate-50 text-slate-600 border-l-2 border-slate-600',
      }
    }
    // Default to jobs/blue
    return {
      active: 'bg-blue-100 text-blue-700 border-l-2 border-blue-600',
      icon: 'text-blue-600',
      childActive: 'bg-blue-50 text-blue-600 border-l-2 border-blue-600',
    }
  }

  return (
    <div className="flex flex-col w-[260px] bg-gray-900 shadow-lg fixed left-0 top-0 h-full">
      <Link href="/dashboard" className="flex items-center h-16 px-6 border-b border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer">
        <Wrench className="h-6 w-6 text-blue-500" />
        <span className="ml-2 text-lg font-semibold text-white">
          RS Automation Portal
        </span>
      </Link>
      
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.filter(item => {
          // Show admin items only to admin users
          if (item.adminOnly) {
            const userRole = session?.user?.role
            // Always check - don't filter if we can't determine role
            if (!session || !session.user || userRole !== 'ADMIN') {
              return false
            }
          }
          return true
        }).map((item) => {
          const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href))
          const hasChildren = item.children && item.children.length > 0
          const moduleClasses = getModuleClasses(item.href)
          
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out',
                  isActive
                    ? moduleClasses.active
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? moduleClasses.icon : 'text-gray-400'
                )} />
                {item.name}
              </Link>
              
              {hasChildren && isActive && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const isChildActive = pathname === child.href
                    const childModuleClasses = getModuleClasses(child.href)
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          'flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-150 ease-in-out',
                          isChildActive
                            ? childModuleClasses.childActive
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        )}
                      >
                        <child.icon className={cn(
                          'mr-3 h-4 w-4 flex-shrink-0',
                          isChildActive ? childModuleClasses.icon : 'text-gray-500'
                        )} />
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