"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TabsListProps {
  tabs: Array<{
    id: string
    label: string
    content: React.ReactNode
    disabled?: boolean
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  tabClassName?: string
  contentClassName?: string
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ tabs, activeTab, onTabChange, className, tabClassName, contentClassName }, ref) => {
    const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

    return (
      <div ref={ref} className={cn("w-full", className)}>
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                "hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground",
                tabClassName
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={cn("mt-4", contentClassName)}>
          {activeTabContent}
        </div>
      </div>
    )
  }
)

TabsList.displayName = "TabsList"

export { TabsList }


