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
      "p-3 sm:p-4 lg:p-6", // Responsive padding
      "max-w-7xl mx-auto", // Consistent max width
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
      "mb-4 sm:mb-6 lg:mb-8",
      "flex flex-col sm:flex-row sm:items-center sm:justify-between",
      "gap-3 sm:gap-4",
      className
    )}>
      <div className="min-w-0 flex-1">
        <h1 className={cn(
          "text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900",
          "truncate" // Prevent text overflow on mobile
        )}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex-shrink-0">
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
      "space-y-4 sm:space-y-6 lg:space-y-8",
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
      "bg-white rounded-lg shadow-sm border border-gray-200",
      "p-4 sm:p-6",
      "hover:shadow-md transition-shadow duration-200",
      className
    )}>
      {children}
    </div>
  )
}
