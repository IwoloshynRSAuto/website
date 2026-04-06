import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { dashboardUi } from '@/components/layout/dashboard-ui'

type DashboardPageShellProps = {
  title: string
  description?: ReactNode
  /** Right side of header (e.g. Add job, SOP buttons) */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function DashboardPageShell({
  title,
  description,
  actions,
  children,
  className,
}: DashboardPageShellProps) {
  return (
    <div className={cn(dashboardUi.pageWrap, className)}>
      <div
        className={cn(
          dashboardUi.sectionGap,
          'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'
        )}
      >
        <div className="min-w-0 flex-1">
          <h1 className={dashboardUi.title}>{title}</h1>
          {description != null ? (
            typeof description === 'string' ? (
              <p className={dashboardUi.description}>{description}</p>
            ) : (
              <div className={dashboardUi.description}>{description}</div>
            )
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center">{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  )
}

export { dashboardUi }
