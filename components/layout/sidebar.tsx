'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Home,
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
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar,
  DollarSign,
  UserCheck,
  TrendingUp,
  MapPin,
} from 'lucide-react'

import { MODULE_COLORS } from '@/lib/dashboard-styles'

const navigation = [
  { 
    name: 'Home', 
    href: '/dashboard/home', 
    icon: Home,
    children: [
      { name: 'PTO Approvals', href: '/dashboard/home/approvals/pto', icon: Calendar, adminOnly: true },
      { name: 'Expense Approvals', href: '/dashboard/home/approvals/expense', icon: DollarSign, adminOnly: true },
    ]
  },
  { 
    name: 'Timesheets', 
    href: '/dashboard/timekeeping', 
    icon: Clock, 
    module: 'timesheets',
    children: [
      { name: 'Attendance', href: '/dashboard/timekeeping/attendance', icon: Clock },
      { name: 'Time', href: '/dashboard/timekeeping/time', icon: FileText },
      { name: 'Timesheet Approvals', href: '/dashboard/timekeeping/approvals/attendance', icon: CheckCircle2, adminOnly: true },
      { name: 'Attendance Approvals', href: '/dashboard/timekeeping/approvals/time-changes', icon: AlertCircle, adminOnly: true },
      { name: 'Attendance Locations', href: '/dashboard/timekeeping/locations', icon: MapPin, adminOnly: true },
    ]
  },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Wrench },
  { 
    name: 'Parts', 
    href: '/dashboard/parts/database', 
    icon: Package,
    children: [
      { name: 'Parts Database', href: '/dashboard/parts/database', icon: Database },
      { name: 'Packages / Assemblies', href: '/dashboard/parts/packages', icon: Box },
      { name: 'BOM', href: '/dashboard/parts/boms', icon: Package },
      { name: 'Part Sales', href: '/dashboard/part-sales', icon: DollarSign },
    ]
  },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Building2 },
  { name: 'Customers', href: '/dashboard/customers', icon: Building2 },
  { 
    name: 'Admin Dashboard', 
    href: '/dashboard/manager', 
    icon: Settings,
    adminOnly: true,
    children: [
      { name: 'Employee Management', href: '/dashboard/admin/employees', icon: Users },
      { name: 'Metrics & Analytics', href: '/dashboard/metrics', icon: BarChart3 },
      { name: 'Labor Codes', href: '/dashboard/admin/labor-codes', icon: Code },
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
    if (href.includes('/home')) {
      return {
        active: 'bg-indigo-100 text-indigo-700 border-l-2 border-indigo-500',
        icon: 'text-indigo-500',
        childActive: 'bg-indigo-50 text-indigo-600 border-l-2 border-indigo-500',
      }
    }
    if (href.includes('/employee') || href.includes('/my-dashboard')) {
      return {
        active: 'bg-cyan-100 text-cyan-700 border-l-2 border-cyan-500',
        icon: 'text-cyan-500',
        childActive: 'bg-cyan-50 text-cyan-600 border-l-2 border-cyan-500',
      }
    }
    if (href.includes('/timekeeping') || href.includes('/timesheets')) {
      return {
        active: 'bg-orange-100 text-orange-700 border-l-2 border-orange-500',
        icon: 'text-orange-500',
        childActive: 'bg-orange-50 text-orange-600 border-l-2 border-orange-500',
      }
    }
    if (href.includes('/metrics') || href.includes('/analytics')) {
      return {
        active: 'bg-emerald-100 text-emerald-700 border-l-2 border-emerald-500',
        icon: 'text-emerald-500',
        childActive: 'bg-emerald-50 text-emerald-600 border-l-2 border-emerald-500',
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
    if (href.includes('/admin') || href.includes('/manager')) {
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
      <Link href="/dashboard/home" className="flex items-center h-16 px-6 border-b border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer">
        <Wrench className="h-6 w-6 text-blue-500" />
        <span className="ml-2 text-lg font-semibold text-white">
          RS Automation Portal
        </span>
      </Link>
      
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.filter(item => {
          // Show admin/manager items only to admin or manager users
          if (item.adminOnly) {
            const userRole = session?.user?.role
            // Always check - don't filter if we can't determine role
            if (!session || !session.user || (userRole !== 'ADMIN' && userRole !== 'MANAGER')) {
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
                  {item.children.filter(child => {
                    // Filter admin/manager-only children
                    if (child.adminOnly) {
                      const userRole = session?.user?.role
                      if (!session || !session.user || (userRole !== 'ADMIN' && userRole !== 'MANAGER')) {
                        return false
                      }
                    }
                    return true
                  }).map((child) => {
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