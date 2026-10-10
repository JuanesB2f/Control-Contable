import {
  Clock,
  Crown,
  PackageX,
  PiggyBank,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

import type { Insight, InsightKind } from "../domain/insights"

const KIND_STYLE: Record<InsightKind, { icon: LucideIcon; className: string }> = {
  stock: { icon: PackageX, className: "bg-destructive/10 text-destructive" },
  growth: { icon: TrendingUp, className: "bg-success/12 text-success" },
  decline: { icon: TrendingDown, className: "bg-warning/15 text-warning" },
  margin: { icon: PiggyBank, className: "bg-primary/10 text-primary" },
  star: { icon: Star, className: "bg-chart-3/20 text-[#a27800] dark:text-chart-3" },
  pareto: { icon: Sparkles, className: "bg-primary/10 text-primary" },
  timing: { icon: Clock, className: "bg-chart-2/25 text-brand" },
  customer: { icon: Crown, className: "bg-chart-3/20 text-[#a27800] dark:text-chart-3" },
}

/** "Pulso": what the numbers mean, in sentences. Scrolls sideways on phones. */
export function InsightsStrip({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null

  return (
    <section aria-label="Lo que dicen tus números" className="-mx-4 sm:mx-0">
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {insights.slice(0, 3).map((insight) => {
          const style = KIND_STYLE[insight.kind]
          return (
            <li
              key={insight.kind}
              className="glass-card flex w-[82%] shrink-0 snap-start gap-3 rounded-3xl p-4 sm:w-auto"
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", style.className)}>
                <style.icon className="size-4.5" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-sm leading-snug font-semibold text-pretty">{insight.title}</p>
                <p className="text-[13px] leading-snug text-muted-foreground text-pretty">{insight.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
