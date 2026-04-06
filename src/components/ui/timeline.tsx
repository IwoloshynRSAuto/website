"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TimelineItem {
  id: string
  title: string
  description?: string
  date?: string
  status?: "completed" | "current" | "upcoming"
  icon?: React.ReactNode
}

export interface TimelineProps {
  items: TimelineItem[]
  className?: string
  itemClassName?: string
}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ items, className, itemClassName }, ref) => {
    return (
      <div ref={ref} className={cn("relative", className)}>
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-6">
          {items.map((item, index) => {
            const isCompleted = item.status === "completed"
            const isCurrent = item.status === "current"
            const isUpcoming = item.status === "upcoming"

            return (
              <div
                key={item.id}
                className={cn(
                  "relative flex items-start space-x-4",
                  itemClassName
                )}
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    isUpcoming && "border-muted-foreground bg-background text-muted-foreground"
                  )}
                >
                  {item.icon ? (
                    item.icon
                  ) : (
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isCompleted && "bg-primary-foreground",
                        isCurrent && "bg-primary",
                        isUpcoming && "bg-muted-foreground"
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3
                      className={cn(
                        "text-sm font-medium",
                        isCompleted && "text-foreground",
                        isCurrent && "text-primary",
                        isUpcoming && "text-muted-foreground"
                      )}
                    >
                      {item.title}
                    </h3>
                    {item.date && (
                      <time
                        className={cn(
                          "text-xs",
                          isCompleted && "text-muted-foreground",
                          isCurrent && "text-primary",
                          isUpcoming && "text-muted-foreground"
                        )}
                      >
                        {item.date}
                      </time>
                    )}
                  </div>
                  {item.description && (
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        isCompleted && "text-muted-foreground",
                        isCurrent && "text-foreground",
                        isUpcoming && "text-muted-foreground"
                      )}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)

Timeline.displayName = "Timeline"

export { Timeline }


