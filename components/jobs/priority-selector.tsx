'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ChevronDown } from 'lucide-react'

interface PrioritySelectorProps {
  priority: string
  onPriorityChange: (priority: string) => void
  disabled?: boolean
}

const priorities = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' },
]

export function PrioritySelector({ 
  priority, 
  onPriorityChange, 
  disabled = false 
}: PrioritySelectorProps) {
  const currentPriority = priorities.find(p => p.value === priority) || priorities[1] // Default to MEDIUM

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs p-0"
          disabled={disabled}
        >
          <Badge className={`${currentPriority.color} text-xs`}>
            {currentPriority.label}
          </Badge>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {priorities.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => onPriorityChange(p.value)}
          >
            <Badge className={`${p.color} text-xs mr-2`}>
              {p.label}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

