import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 px-6 py-14 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-6" strokeWidth={1.75} />
      </span>
      <div className="max-w-sm space-y-1.5">
        <p className="text-[15px] font-semibold">{title}</p>
        {description ? <p className="text-sm text-muted-foreground text-pretty">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
