"use client"

import * as React from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface SwitchGroupProps {
  options: Array<{
    id: string
    label: string
    description?: string
    checked?: boolean
    disabled?: boolean
  }>
  onChange?: (id: string, checked: boolean) => void
  className?: string
}

const SwitchGroup = React.forwardRef<HTMLDivElement, SwitchGroupProps>(
  ({ options, onChange, className }, ref) => {
    const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>(
      options.reduce((acc, option) => {
        acc[option.id] = option.checked || false
        return acc
      }, {} as Record<string, boolean>)
    )

    const handleChange = (id: string, checked: boolean) => {
      setCheckedItems(prev => ({
        ...prev,
        [id]: checked
      }))
      onChange?.(id, checked)
    }

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {options.map((option) => (
          <div key={option.id} className="flex items-center space-x-3">
            <Switch
              id={option.id}
              checked={checkedItems[option.id]}
              onCheckedChange={(checked) => handleChange(option.id, checked)}
              disabled={option.disabled}
            />
            <div className="flex-1">
              <Label
                htmlFor={option.id}
                className={cn(
                  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                  option.disabled && "opacity-50"
                )}
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }
)

SwitchGroup.displayName = "SwitchGroup"

export { SwitchGroup }


