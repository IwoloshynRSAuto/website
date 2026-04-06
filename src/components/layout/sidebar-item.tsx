'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'

type NavVisibility = 'all' | 'manager' | 'admin'

interface SidebarItemProps {
  item: {
    name: string
    href: string
    icon: any
    children?: Array<{
      name: string
      href: string
      icon: any
      /** @deprecated use visibility */
      adminOnly?: boolean
      visibility?: NavVisibility
    }>
    adminOnly?: boolean
  }
  getModuleClasses: (href: string) => {
    active: string
    icon: string
    childActive: string
  }
}

export function SidebarItem({ item, getModuleClasses }: SidebarItemProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const hasChildren = item.children && item.children.length > 0
  const isParentActive = pathname === item.href || (hasChildren && item.children?.some((child: any) => pathname === child.href))
  const [isExpanded, setIsExpanded] = useState(isParentActive)
  const moduleClasses = getModuleClasses(item.href)

  // Auto-expand if parent or any child is active
  useEffect(() => {
    if (isParentActive) {
      setIsExpanded(true)
    }
  }, [isParentActive])

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out',
            isParentActive
              ? moduleClasses.active
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          )}
        >
          <div className="flex items-center">
            <item.icon className={cn(
              'mr-3 h-5 w-5 flex-shrink-0',
              isParentActive ? moduleClasses.icon : 'text-gray-400'
            )} />
            {item.name}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400 transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 transition-transform" />
          )}
        </button>
        
        {isExpanded && item.children && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children.filter((child: any) => {
              const v: NavVisibility = child.visibility ?? (child.adminOnly ? 'manager' : 'all')
              const role = session?.user?.role
              if (v === 'all') return true
              if (!session?.user) return false
              if (v === 'admin') return role === 'ADMIN'
              if (v === 'manager') return role === 'ADMIN' || role === 'MANAGER'
              return true
            }).map((child: any) => {
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
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out',
        pathname === item.href
          ? moduleClasses.active
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      )}
    >
      <item.icon className={cn(
        'mr-3 h-5 w-5 flex-shrink-0',
        pathname === item.href ? moduleClasses.icon : 'text-gray-400'
      )} />
      {item.name}
    </Link>
  )
}

