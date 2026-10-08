"use client"

import { Menu, Search, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useSidebar } from "@/components/ui/sidebar"
import { navigation, settingsNavItem, type NavItem } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"

import { useCommandPalette } from "./command-palette"

const tabClassName =
  "flex min-w-0 flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[10px] font-medium text-muted-foreground transition-colors active:scale-95"

function TabContent({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <Icon className="size-[22px]" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </>
  )
}

/** iOS-style bottom navigation for phones; the sidebar stays available behind "Más". */
export function MobileTabBar() {
  const pathname = usePathname()
  const { organization } = useOrg()
  const can = useCan()
  const { setOpenMobile } = useSidebar()
  const palette = useCommandPalette()

  const [first, ...rest] = [...navigation.flatMap((group) => group.items), settingsNavItem].filter(
    (item) => item.mobile && item.status === "available" && can(item.permission),
  )

  const renderLink = (item: NavItem) => {
    const href = item.href(organization.slug)
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return (
      <Link key={item.id} href={href} className={cn(tabClassName, active && "text-primary")}>
        <TabContent icon={item.icon} label={item.title} />
      </Link>
    )
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="glass fixed inset-x-0 bottom-0 z-30 flex border-t border-border/60 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {first ? renderLink(first) : null}
      <button type="button" onClick={palette.open} className={tabClassName}>
        <TabContent icon={Search} label="Buscar" />
      </button>
      {rest.map(renderLink)}
      <button type="button" onClick={() => setOpenMobile(true)} className={tabClassName}>
        <TabContent icon={Menu} label="Más" />
      </button>
    </nav>
  )
}
