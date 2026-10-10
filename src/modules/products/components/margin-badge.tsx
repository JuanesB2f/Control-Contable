import { cn } from "@/lib/utils"

import { marginHealth, type MarginHealth } from "../domain/pricing"

const BADGE_TONE: Record<MarginHealth, string> = {
  loss: "bg-destructive/10 text-destructive",
  thin: "bg-warning/15 text-warning",
  healthy: "bg-primary/10 text-primary",
  great: "bg-success/12 text-success",
}

export function MarginBadge({ ratio, label, className }: { ratio: number; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        BADGE_TONE[marginHealth(ratio)],
        className,
      )}
    >
      {label}
    </span>
  )
}
