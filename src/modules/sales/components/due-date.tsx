"use client"

import { CalendarClock } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { CREDIT_TERM_OPTIONS, addDays, dueLabel, dueStatus, type DueStatus } from "../domain/due-dates"

export const DUE_STYLES: Record<DueStatus, string> = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-destructive/10 text-destructive",
  soon: "bg-warning/15 text-warning",
  upcoming: "bg-muted text-muted-foreground",
  none: "bg-muted text-muted-foreground",
}

export function DueBadge({ dueDate, todayKey, className }: { dueDate: string | null; todayKey: string; className?: string }) {
  const info = dueStatus(dueDate, todayKey)
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-medium tabular-nums", DUE_STYLES[info.status], className)}>
      <CalendarClock className="size-3" />
      {dueLabel(info)}
    </span>
  )
}

type DueDateFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  todayKey: string
}

/** Date the customer promises to pay the rest, with quick terms. */
export function DueDateField({ id, value, onChange, todayKey }: DueDateFieldProps) {
  return (
    <div className="grid gap-2">
      <Input
        id={id}
        type="date"
        value={value}
        min={todayKey}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Fecha límite de pago"
        className="w-full sm:w-48"
      />
      <div className="flex flex-wrap gap-1.5">
        {CREDIT_TERM_OPTIONS.map((days) => {
          const date = addDays(todayKey, days)
          return (
            <button
              key={days}
              type="button"
              onClick={() => onChange(date)}
              aria-pressed={value === date}
              className={cn(
                "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
                value === date ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {days} días
            </button>
          )
        })}
      </div>
    </div>
  )
}
