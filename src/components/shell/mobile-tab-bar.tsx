"use client"

import { Menu, Plus, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useSidebar } from "@/components/ui/sidebar"
import { navigation, type NavItem } from "@/config/navigation"
import { routes } from "@/config/routes"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"

const tabClassName =
  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium text-muted-foreground transition-[color,transform] active:scale-90"

function TabContent({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <Icon className="size-[22px]" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </>
  )
}

/** Floating iOS-style tab bar for phones, with selling one thumb tap away in the middle. */
export function MobileTabBar() {
  const pathname = usePathname()
  const { organization } = useOrg()
  const can = useCan()
  const { setOpenMobile } = useSidebar()

  const tabs = navigation.flatMap((group) => group.items).filter((item) => item.mobile && can(item.permission))
  const middle = Math.ceil(tabs.length / 2)

  const renderLink = (item: NavItem) => {
    const href = item.href(organization.slug)
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return (
      <Link key={item.id} href={href} aria-current={active ? "page" : undefined} className={cn(tabClassName, active && "text-primary")}>
        <TabContent icon={item.icon} label={item.title} />
      </Link>
    )
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-1 rounded-[28px] glass-card px-2 py-1.5 md:hidden"
    >
      {tabs.slice(0, middle).map(renderLink)}
      {can("sales.create") ? (
        <Link
          href={`${routes.org.sales(organization.slug)}?new=1`}
          aria-label="Nueva venta"
          className="mx-1 flex size-13 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35 transition-transform active:scale-90"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </Link>
      ) : null}
      {tabs.slice(middle).map(renderLink)}
      <button type="button" onClick={() => setOpenMobile(true)} className={tabClassName}>
        <TabContent icon={Menu} label="Más" />
      </button>
    </nav>
  )
}
