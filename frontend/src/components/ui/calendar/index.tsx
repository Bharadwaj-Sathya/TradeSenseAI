"use client"

import { cn } from "@/lib/utils"

// Calendar component stub — react-day-picker is not installed in this project.
// Replace with a full implementation when the calendar feature is needed.
export type CalendarProps = {
  className?: string
  showOutsideDays?: boolean
}

function Calendar({ className }: CalendarProps) {
  return (
    <div className={cn("p-3 text-sm text-gray-500", className)}>
      Calendar component (not yet implemented)
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
