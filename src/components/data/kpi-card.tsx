import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type Trend = { direction: "up" | "down" | "flat"; text: string; positiveIsGood?: boolean }

/** Builds the trend chip from a relative change (0.12 → "+12 %"). */
export function trendFromChange(change: number | null, percent: (ratio: number) => string, positiveIsGood = true): Trend | undefined {
  if (change === null) return undefined
  if (Math.abs(change) < 0.005) return { direction: "flat", text: "Igual", positiveIsGood }
  return {
    direction: change > 0 ? "up" : "down",
    text: `${change > 0 ? "+" : "−"}${percent(Math.abs(change))}`,
    positiveIsGood,
  }
}

export function TrendChip({ trend, className }: { trend: Trend; className?: string }) {
  const good = trend.direction !== "flat" && (trend.direction === "up") === (trend.positiveIsGood ?? true)
  const Icon = trend.direction === "up" ? ArrowUpRight : trend.direction === "down" ? ArrowDownRight : Minus
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
        trend.direction === "flat" ? "bg-muted text-muted-foreground" : good ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      {trend.text}
    </span>
  )
}

type KpiCardProps = {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  trend?: Trend
  hint?: string
  accent?: "primary" | "gold" | "neutral"
  className?: string
}

const ACCENTS = {
  primary: "bg-primary/10 text-primary",
  gold: "bg-chart-3/15 text-[#a27800] dark:text-chart-3",
  neutral: "bg-muted text-muted-foreground",
} as const

export function KpiCard({ label, value, icon: Icon, trend, hint, accent = "primary", className }: KpiCardProps) {
  return (
    <div className={cn("glass-card flex min-w-0 flex-col gap-3 rounded-3xl p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", ACCENTS[accent])}>
          <Icon className="size-4" strokeWidth={2} />
        </span>
      </div>
      <p className="truncate text-[22px] leading-none font-semibold tracking-tight tabular-nums sm:text-[26px]">{value}</p>
      <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {trend ? <TrendChip trend={trend} /> : null}
        {hint ? <span className="truncate">{hint}</span> : null}
      </div>
    </div>
  )
}
