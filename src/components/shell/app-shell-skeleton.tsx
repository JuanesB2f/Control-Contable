import { Skeleton } from "@/components/ui/skeleton"

import { PageSkeleton } from "./page-skeleton"

/** Static placeholder of the app chrome shown while the session and organization resolve. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full bg-sidebar" aria-busy aria-label="Cargando">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 p-3 pt-4 md:flex">
        <div className="flex items-center gap-2 px-1">
          <Skeleton className="size-8 rounded-[28%] bg-sidebar-accent" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-28 bg-sidebar-accent" />
            <Skeleton className="h-2.5 w-16 bg-sidebar-accent" />
          </div>
        </div>
        <div className="space-y-2.5 px-1">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-6 bg-sidebar-accent" style={{ width: `${60 + ((index * 17) % 35)}%` }} />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-background md:m-2 md:ml-0 md:rounded-xl md:border md:border-border/60 md:shadow-sm">
        <div className="h-13 border-b border-border/60" />
        <PageSkeleton />
      </div>
    </div>
  )
}
