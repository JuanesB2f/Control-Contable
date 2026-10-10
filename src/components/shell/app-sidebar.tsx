"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { AppLogo } from "@/components/brand/app-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { navigation, settingsNavItem, type NavItem } from "@/config/navigation"
import { siteConfig } from "@/config/site"
import { useCan, useOrg } from "@/modules/access/components/org-provider"

import { OrgSwitcher } from "./org-switcher"
import { UserMenu } from "./user-menu"

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const { organization } = useOrg()
  const { setOpenMobile } = useSidebar()
  const href = item.href(organization.slug)
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className="data-[active=true]:font-medium data-[active=true]:[&>svg]:text-primary"
      >
        <Link href={href} onClick={() => setOpenMobile(false)}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const can = useCan()

  const groups = navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="pt-3">
        <div className="flex items-center gap-2 px-2 pb-1 group-data-[collapsible=icon]:hidden">
          <AppLogo className="size-6" />
          <span className="text-[15px] font-semibold tracking-tight text-brand">{siteConfig.name}</span>
        </div>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.id}>
            {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavLink key={item.id} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <NavLink item={settingsNavItem} />
        </SidebarMenu>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
