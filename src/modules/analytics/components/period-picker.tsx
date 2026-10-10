import Link from "next/link"

import { cn } from "@/lib/utils"

import { PERIOD_KEYS, PERIODS, type PeriodKey } from "../domain/period"

type PeriodPickerProps = {
  basePath: string
  current: PeriodKey
  /** Other search params to keep when switching, e.g. the dashboard view. */
  params?: Record<string, string>
}

/** Segmented period switcher backed by the `?period=` search param, so every view is linkable. */
export function PeriodPicker({ basePath, current, params }: PeriodPickerProps) {
  return (
    <nav aria-label="Periodo" className="glass-card flex w-full rounded-2xl p-1 sm:inline-flex sm:w-auto">
      {PERIOD_KEYS.map((key) => (
        <Link
          key={key}
          href={`${basePath}?${new URLSearchParams({ ...params, period: key })}`}
          scroll={false}
          aria-current={key === current ? "page" : undefined}
          className={cn(
            "flex-1 rounded-xl px-2.5 py-2 text-center text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-all hover:text-foreground active:scale-95 sm:flex-none sm:px-3 sm:py-1.5 sm:text-xs",
            key === current && "bg-background text-foreground shadow-sm",
          )}
        >
          {PERIODS[key].short}
        </Link>
      ))}
    </nav>
  )
}
