"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-base font-semibold text-gray-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-white border-gray-300 p-0 hover:bg-gray-50 hover:border-gray-400 transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex mb-2",
        head_cell:
          "!text-gray-600 !rounded-md !w-10 !h-8 !font-semibold !text-xs !uppercase !tracking-wide !flex !items-center !justify-center !mx-auto",
        row: "flex w-full mt-1",
        cell: "!h-10 !w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "!h-10 !w-10 !p-0 !font-medium !text-gray-700 hover:!bg-blue-50 hover:!text-blue-700 !rounded-md !transition-colors aria-selected:!opacity-100 !m-0"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "!bg-blue-600 !text-white hover:!bg-blue-700 hover:!text-white focus:!bg-blue-700 focus:!text-white !font-semibold !shadow-md !rounded-md",
        day_today: "!bg-blue-100 !text-blue-900 !font-semibold !border-2 !border-blue-300 !rounded-md",
        day_outside:
          "day-outside text-gray-400 opacity-40 aria-selected:bg-blue-100/50 aria-selected:text-blue-700 aria-selected:opacity-100",
        day_disabled: "text-gray-300 opacity-40 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-blue-100 aria-selected:text-blue-700",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4 text-gray-600" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4 text-gray-600" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }


