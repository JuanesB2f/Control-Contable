import { cn } from "@/lib/utils"

import { SEGMENT_INFO, type CustomerSegment } from "../domain/segments"

export const SEGMENT_TONE: Record<CustomerSegment, string> = {
  champion: "bg-chart-3/15 text-[#a27800] dark:text-chart-3",
  loyal: "bg-primary/10 text-primary",
  new: "bg-success/12 text-success",
  at_risk: "bg-destructive/10 text-destructive",
  occasional: "bg-muted text-muted-foreground",
  prospect: "bg-muted text-muted-foreground",
}

export function SegmentBadge({ segment, className }: { segment: CustomerSegment; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium", SEGMENT_TONE[segment], className)}
      title={SEGMENT_INFO[segment].description}
    >
      {SEGMENT_INFO[segment].label}
    </span>
  )
}
