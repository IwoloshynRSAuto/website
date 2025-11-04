'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardPageProps {
  children: ReactNode
  className?: string
}

export function DashboardPageContainer({ children, className }: DashboardPageProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gray-50",
      "px-6 py-4", // Standardized padding per spec
      className
    )}>
      {children}
    </div>
  )
}

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode
  className?: string
}

export function DashboardHeader({ title, subtitle, children, className }: DashboardHeaderProps) {
  return (
    <div className={cn(
      "mb-6",
      "flex flex-col sm:flex-row sm:items-center sm:justify-between",
      "gap-4",
      className
    )}>
      <div className="min-w-0 flex-1">
        <h1 className={cn(
          "text-2xl font-semibold text-gray-900",
          "truncate"
        )}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

interface DashboardContentProps {
  children: ReactNode
  className?: string
}

export function DashboardContent({ children, className }: DashboardContentProps) {
  return (
    <div className={cn(
      "space-y-4", // Standardized gap per spec
      className
    )}>
      {children}
    </div>
  )
}

interface DashboardGridProps {
  children: ReactNode
  className?: string
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div className={cn(
      "grid gap-4 sm:gap-6",
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  )
}

interface DashboardCardProps {
  children: ReactNode
  className?: string
}

export function DashboardCard({ children, className }: DashboardCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-md border border-gray-200",
      "p-6",
      "hover:shadow-lg transition-shadow duration-200",
      className
    )}>
      {children}
    </div>
  )
}
