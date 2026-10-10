"use client"

import { Search } from "lucide-react"
import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { navigation, settingsNavItem } from "@/config/navigation"
import { useOrg } from "@/modules/access/components/org-provider"

import { useCommandPalette } from "./command-palette"

const subscribeToNothing = () => () => {}

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true })
  return () => window.removeEventListener("scroll", onChange)
}

function useSectionTitle() {
  const pathname = usePathname()
  const { organization } = useOrg()
  const items = [...navigation.flatMap((group) => group.items), settingsNavItem]
  const match = items.find((item) => {
    const href = item.href(organization.slug)
    return pathname === href || pathname.startsWith(`${href}/`)
  })
  return match?.title ?? organization.name
}

export function AppTopbar({ notifications }: { notifications: React.ReactNode }) {
  const title = useSectionTitle()
  const palette = useCommandPalette()
  const isApplePlatform = useSyncExternalStore(
    subscribeToNothing,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => false,
  )
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 4,
    () => false,
  )

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-20 flex h-13 shrink-0 items-center gap-2 border-b border-transparent bg-background px-4 transition-[border-color] data-scrolled:border-border/60 md:glass md:rounded-t-xl md:border-border/60"
    >
      <SidebarTrigger className="-ml-1 text-muted-foreground max-md:hidden" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4 max-md:hidden" />
      <p className="truncate text-[17px] font-semibold tracking-tight md:text-sm md:font-medium md:tracking-normal">{title}</p>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {notifications}
        <Button
          variant="outline"
          onClick={palette.open}
          className="hidden h-8 w-56 justify-start gap-2 rounded-lg bg-muted/60 px-2.5 font-normal text-muted-foreground shadow-none hover:bg-muted sm:flex"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left text-[13px]">Buscar…</span>
          <kbd className="pointer-events-none rounded-md border bg-background px-1.5 font-sans text-[11px] font-medium">
            {isApplePlatform ? "⌘K" : "Ctrl K"}
          </kbd>
        </Button>
        <Button variant="ghost" size="icon" onClick={palette.open} className="sm:hidden" aria-label="Buscar">
          <Search />
        </Button>
      </div>
    </header>
  )
}
