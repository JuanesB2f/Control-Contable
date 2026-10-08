"use client"

import { Check, ChevronsUpDown, Plus } from "lucide-react"
import Link from "next/link"

import { OrgAvatar } from "@/components/data/org-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { routes } from "@/config/routes"
import { useOrg } from "@/modules/access/components/org-provider"
import { ROLE_LABELS } from "@/modules/access/domain/permissions"

export function OrgSwitcher() {
  const { organization, organizations, role } = useOrg()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <OrgAvatar name={organization.name} seed={organization.id} />
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-[13px] font-semibold">{organization.name}</span>
                <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={6}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">Tus negocios</DropdownMenuLabel>
            {organizations.map((item) => (
              <DropdownMenuItem key={item.id} asChild className="gap-2.5 py-1.5">
                <Link href={routes.org.dashboard(item.slug)} onClick={() => setOpenMobile(false)}>
                  <OrgAvatar name={item.name} seed={item.id} className="size-6 text-[9px]" />
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.slug === organization.slug ? <Check className="size-4 text-primary" /> : null}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2.5 py-1.5">
              <Link href={routes.onboarding}>
                <span className="flex size-6 items-center justify-center rounded-[28%] border border-dashed">
                  <Plus className="size-3.5" />
                </span>
                Crear negocio
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
