"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

export interface ToggleCardProps {
  title: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

const ToggleCard = React.forwardRef<HTMLDivElement, ToggleCardProps>(
  ({ title, description, checked, onCheckedChange, disabled, className, children }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all duration-200",
          checked && "ring-2 ring-primary ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
          />
        </CardHeader>
        {children && (
          <CardContent className="pt-0">
            {children}
          </CardContent>
        )}
      </Card>
    )
  }
)

ToggleCard.displayName = "ToggleCard"

export { ToggleCard }


