import { cn } from "@/lib/utils"

import { marginHealth, type MarginHealth } from "../domain/pricing"

export const MARGIN_TONE: Record<MarginHealth, string> = {
  loss: "text-destructive",
  thin: "text-warning",
  healthy: "text-primary",
  great: "text-success",
}

/** Circular gauge of the margin; the number in the middle is what you keep of each sale. */
export function MarginRing({ ratio, label, className }: { ratio: number; label: string; className?: string }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const filled = Math.min(Math.max(ratio, 0), 1) * circumference

  return (
    <div className={cn("relative size-20 shrink-0", MARGIN_TONE[marginHealth(ratio)], className)}>
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={7} />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base leading-none font-semibold tabular-nums">{label}</span>
        <span className="mt-0.5 text-[9px] font-medium tracking-wide text-muted-foreground uppercase">margen</span>
      </span>
    </div>
  )
}
