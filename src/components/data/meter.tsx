import { cn } from "@/lib/utils"

type MeterProps = {
  /** 0..1 */
  value: number
  tone?: "primary" | "success" | "warning" | "destructive" | "muted"
  className?: string
  label?: string
}

const TONES = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/40",
} as const

export function Meter({ value, tone = "primary", className, label }: MeterProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100)
  return (
    <div
      role="meter"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", TONES[tone])} style={{ width: `${percent}%` }} />
    </div>
  )
}
