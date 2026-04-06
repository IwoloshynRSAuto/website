'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarItem } from './sidebar-item'
import {
  Clock,
  FileText,
  Wrench,
  CheckCircle2,
  CalendarClock,
  Briefcase,
  Shield,
  Building2,
  Home,
  Database,
} from 'lucide-react'

const navigation = [
  {
    name: 'Home',
    href: '/dashboard/home',
    icon: Home,
  },
  {
    name: 'Timekeeping',
    href: '/dashboard/timekeeping/attendance',
    icon: Clock,
    module: 'timekeeping',
    children: [
      { name: 'Attendance', href: '/dashboard/timekeeping/attendance', icon: CalendarClock },
      { name: 'Time', href: '/dashboard/timekeeping/time', icon: Clock },
      { name: 'Approvals', href: '/dashboard/timekeeping/approvals', icon: CheckCircle2, visibility: 'admin' as const },
    ]
  },
  {
    name: 'Jobs & Quotes',
    href: '/dashboard/jobs',
    icon: Briefcase,
    children: [
      { name: 'Jobs', href: '/dashboard/jobs', icon: Wrench },
      { name: 'Quotes', href: '/dashboard/jobs/quotes', icon: FileText },
    ],
  },
  {
    name: 'Admin',
    href: '/dashboard/admin/employees',
    icon: Shield,
    children: [
      { name: 'Employees', href: '/dashboard/admin/employees', icon: Shield, visibility: 'admin' as const },
      { name: 'Customers', href: '/dashboard/admin/customers', icon: Building2, visibility: 'admin' as const },
      { name: 'Export / import', href: '/dashboard/admin/database', icon: Database, visibility: 'admin' as const },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  const getModuleClasses = (href: string) => {
    if (href.includes('/timekeeping')) {
      return {
        active: 'bg-orange-100 text-orange-700 border-l-2 border-orange-500',
        icon: 'text-orange-500',
        childActive: 'bg-orange-50 text-orange-600 border-l-2 border-orange-500',
      }
    }
    if (href.includes('/jobs') || href.includes('/quotes')) {
      return {
        active: 'bg-blue-100 text-blue-700 border-l-2 border-blue-600',
        icon: 'text-blue-600',
        childActive: 'bg-blue-50 text-blue-600 border-l-2 border-blue-600',
      }
    }
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
        {navigation.map((item) => (
          <SidebarItem key={item.name} item={item} getModuleClasses={getModuleClasses} />
        ))}
      </nav>
    </div>
  )
}