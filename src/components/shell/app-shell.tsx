"use client"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { OrgProvider, type OrgClientContext } from "@/modules/access/components/org-provider"

import { AppSidebar } from "./app-sidebar"
import { AppTopbar } from "./app-topbar"
import { CommandPaletteProvider } from "./command-palette"
import { MobileTabBar } from "./mobile-tab-bar"

type AppShellProps = {
  context: OrgClientContext
  defaultSidebarOpen: boolean
  children: React.ReactNode
}

export function AppShell({ context, defaultSidebarOpen, children }: AppShellProps) {
  return (
    <OrgProvider value={context}>
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        <CommandPaletteProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <AppTopbar />
            <main className="flex-1 pb-28 md:pb-0">{children}</main>
          </SidebarInset>
          <MobileTabBar />
        </CommandPaletteProvider>
      </SidebarProvider>
    </OrgProvider>
  )
}
