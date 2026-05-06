import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { dashboardUi } from '@/components/layout/dashboard-ui'
import { HowToButton } from '@/components/ui/how-to-button'

type DashboardPageShellProps = {
  title: string
  description?: ReactNode
  /** Right side of header (e.g. Add job, SOP buttons) */
  actions?: ReactNode
  /** Optional help content shown in a consistent How to modal. */
  howTo?: {
    title?: string
    description?: string
    content: ReactNode
    buttonLabel?: string
  }
  children: ReactNode
  className?: string
}

export function DashboardPageShell({
  title,
  description,
  actions,
  howTo,
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
        <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          <HowToButton
            title={howTo?.title ?? `${title} — how it works`}
            description={howTo?.description ?? 'Quick tips and reminders for using this page.'}
            buttonLabel={howTo?.buttonLabel ?? 'How to'}
            className="h-9"
          >
            {howTo?.content ?? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground space-y-2">
                <p className="text-foreground font-medium">Common patterns across the portal</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Use search/filter controls near the top to narrow results.</li>
                  <li>Most tables support export; look for an Export button near the header.</li>
                  <li>Edits usually save immediately or via a Save button at the top.</li>
                </ul>
              </div>
            )}
          </HowToButton>
          {actions}
        </div>
      </div>
      {children}
    </div>
  )
}

export { dashboardUi }
