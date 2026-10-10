import Link from "next/link"

import { cn } from "@/lib/utils"

import { DASHBOARD_VIEW_INFO, dashboardParams, type DashboardView } from "../domain/views"

type DashboardTabsProps = {
  basePath: string
  views: readonly DashboardView[]
  current: DashboardView
  period: string
}

/** Pill tabs for each board; scrolls sideways on phones instead of wrapping. */
export function DashboardTabs({ basePath, views, current, period }: DashboardTabsProps) {
  return (
    <nav aria-label="Tableros" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2">
        {views.map((view) => {
          const query = new URLSearchParams(dashboardParams(view, period)).toString()
          const active = view === current
          return (
            <Link
              key={view}
              href={query ? `${basePath}?${query}` : basePath}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all active:scale-95",
                active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "glass-card text-muted-foreground hover:text-foreground",
              )}
            >
              {DASHBOARD_VIEW_INFO[view].label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
