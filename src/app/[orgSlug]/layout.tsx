import { cookies } from "next/headers"
import { Suspense } from "react"

import { AppShell } from "@/components/shell/app-shell"
import { AppShellSkeleton } from "@/components/shell/app-shell-skeleton"
import { requireOrgContext } from "@/modules/access/application/org-context"
import { NotificationBell } from "@/modules/notifications/components/notification-bell"
import { NotificationsLoader } from "@/modules/notifications/components/notifications-loader"
import { getMyOrganizations } from "@/modules/organizations/application/queries"

async function OrgShell({ params, children }: Pick<LayoutProps<"/[orgSlug]">, "params" | "children">) {
  const { orgSlug } = await params
  const [context, organizations, cookieStore] = await Promise.all([
    requireOrgContext(orgSlug),
    getMyOrganizations(),
    cookies(),
  ])

  return (
    <AppShell
      context={{ ...context, organizations }}
      defaultSidebarOpen={cookieStore.get("sidebar_state")?.value !== "false"}
      notifications={
        <Suspense fallback={<NotificationBell state="loading" />}>
          <NotificationsLoader context={context} />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  )
}

export default function OrgLayout({ params, children }: LayoutProps<"/[orgSlug]">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <OrgShell params={params}>{children}</OrgShell>
    </Suspense>
  )
}
