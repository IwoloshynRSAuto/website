"use client"

import * as React from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SimpleDatePickerProps {
  date?: Date
  setDate?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function SimpleDatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className,
}: SimpleDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(date || new Date())
  const today = new Date()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Get first day of week for the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = getDay(monthStart)
  
  // Create array of days to display (including leading/trailing days from adjacent months)
  const daysToShow: (Date | null)[] = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysToShow.push(null)
  }
  
  // Add all days in the month
  daysInMonth.forEach(day => daysToShow.push(day))
  
  // Fill remaining cells to complete the grid (6 rows × 7 columns = 42 cells)
  while (daysToShow.length < 42) {
    daysToShow.push(null)
  }

  const handleDateSelect = (selectedDate: Date) => {
    setDate?.(selectedDate)
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full sm:w-[220px] justify-start text-left font-normal h-9 sm:h-10 text-xs sm:text-sm",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          {date ? (
            <>
              <span className="sm:hidden">{format(date, "MMM d, yyyy")}</span>
              <span className="hidden sm:inline">{format(date, "MMMM d, yyyy")}</span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-5 bg-white border-gray-300 shadow-xl" align="start" side="bottom" sideOffset={8}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-gray-100 rounded-lg"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handlePrevMonth()
              }}
            >
              <ChevronLeft className="h-4 w-4 text-gray-700" />
            </Button>
            <div className="font-bold text-base sm:text-lg text-gray-900 px-2 sm:px-4">
              <span className="sm:hidden">{format(currentMonth, "MMM yyyy")}</span>
              <span className="hidden sm:inline">{format(currentMonth, "MMMM yyyy")}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-gray-100 rounded-lg"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleNextMonth()
              }}
            >
              <ChevronRight className="h-4 w-4 text-gray-700" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="h-10 flex items-center justify-center text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-2">
              {daysToShow.map((day, idx) => {
                if (!day) {
                  return <div key={idx} className="h-10" />
                }

                const isSelected = date && isSameDay(day, date)
                const isToday = isSameDay(day, today)
                const isCurrentMonth = isSameMonth(day, currentMonth)

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDateSelect(day)
                    }}
                    className={cn(
                      "h-10 w-10 rounded-lg text-sm font-semibold transition-all duration-150",
                      "flex items-center justify-center",
                      !isCurrentMonth && "text-gray-300",
                      isCurrentMonth && !isSelected && !isToday && "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                      isToday && !isSelected && "bg-blue-100 text-blue-900 border-2 border-blue-400 font-bold",
                      isSelected && "bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-md scale-105"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

