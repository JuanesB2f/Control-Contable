"use client"

import { ChevronsUpDown, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useTransition } from "react"

import { UserAvatar } from "@/components/data/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { routes } from "@/config/routes"
import { useOrg } from "@/modules/access/components/org-provider"
import { signOut } from "@/modules/auth/application/actions"

const THEMES = [
  { value: "light", label: "Clara", icon: Sun },
  { value: "dark", label: "Oscura", icon: Moon },
  { value: "system", label: "Automática", icon: Monitor },
] as const

export function UserMenu() {
  const { user, organization } = useOrg()
  const { isMobile, setOpenMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [pending, startTransition] = useTransition()
  const displayName = user.fullName ?? user.email

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar name={displayName} imageUrl={user.avatarUrl} />
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-[13px] font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={6}
          >
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={routes.org.profile(organization.slug)} onClick={() => setOpenMobile(false)}>
                  <UserRound />
                  Tu perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun />
                  Apariencia
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl">
                  <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                    {THEMES.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        <option.icon />
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pending}
              onSelect={(event) => {
                event.preventDefault()
                startTransition(() => signOut())
              }}
            >
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
