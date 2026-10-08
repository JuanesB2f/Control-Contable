import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[28px]">{title}</h1>
        {description ? <p className="text-[15px] text-muted-foreground text-pretty">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/** Standard page container: comfortable reading width and consistent vertical rhythm. */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10", className)}>
      {children}
    </div>
  )
}
