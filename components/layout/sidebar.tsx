'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SidebarItem } from './sidebar-item'
import {
  Home,
  Clock,
  FileText,
  Wrench,
  CheckCircle2,
  Settings,
  Users,
  BarChart3,
  Code,
} from 'lucide-react'

const navigation = [
  { 
    name: 'Home', 
    href: '/dashboard/home', 
    icon: Home,
  },
  { 
    name: 'Timesheets', 
    href: '/dashboard/timesheets/attendance', 
    icon: Clock,
    module: 'timesheets',
    children: [
      { name: 'Attendance', href: '/dashboard/timesheets/attendance', icon: Clock },
      { name: 'Time', href: '/dashboard/timesheets/time', icon: FileText },
      { name: 'Approvals', href: '/dashboard/timesheets/approvals', icon: CheckCircle2 },
    ]
  },
  {
    name: 'Work',
    href: '/dashboard/quotes',
    icon: Wrench,
    children: [
      { name: 'Quotes', href: '/dashboard/quotes', icon: FileText },
      { name: 'Jobs', href: '/dashboard/jobs', icon: Wrench },
    ],
  },
  {
    name: 'Admin Dashboard',
    href: '/dashboard/manager',
    icon: Settings,
    adminOnly: true,
    children: [
      { name: 'Employee Management', href: '/dashboard/admin/employees', icon: Users },
      { name: 'Metrics & Analytics', href: '/dashboard/metrics', icon: BarChart3 },
      { name: 'Labor Codes', href: '/dashboard/admin/labor-codes', icon: Code },
      { name: 'Task Codes', href: '/dashboard/admin/task-codes', icon: FileText },
    ],
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
    if (href.includes('/timesheets')) {
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
    if (href.includes('/dashboard/quotes') || href.includes('/dashboard/jobs')) {
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
    if (href.includes('/tasks')) {
      return {
        active: 'bg-green-100 text-green-700 border-l-2 border-green-600',
        icon: 'text-green-600',
        childActive: 'bg-green-50 text-green-600 border-l-2 border-green-600',
      }
    }
    if (href.includes('/development')) {
      return {
        active: 'bg-violet-100 text-violet-700 border-l-2 border-violet-600',
        icon: 'text-violet-600',
        childActive: 'bg-violet-50 text-violet-600 border-l-2 border-violet-600',
      }
    }
    if (href.includes('/ebay')) {
      return {
        active: 'bg-green-100 text-green-700 border-l-2 border-green-600',
        icon: 'text-green-600',
        childActive: 'bg-green-50 text-green-600 border-l-2 border-green-600',
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
            if (!session || !session.user || (userRole !== 'ADMIN' && userRole !== 'MANAGER')) {
              return false
            }
          }
          return true
        }).map((item) => (
          <SidebarItem key={item.name} item={item} getModuleClasses={getModuleClasses} />
        ))}
      </nav>
    </div>
  )
}