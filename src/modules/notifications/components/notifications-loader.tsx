import { unstable_rethrow } from "next/navigation"

import type { OrgContext } from "@/modules/access/application/org-context"

import { getNotifications } from "../application/queries"
import { NotificationBell, type NotificationsState } from "./notification-bell"

/** Streams the bell in, so the rest of the shell never waits for these queries. */
export async function NotificationsLoader({ context }: { context: OrgContext }) {
  let state: NotificationsState
  try {
    state = await getNotifications(context)
  } catch (error) {
    unstable_rethrow(error)
    console.error("No se pudieron cargar las notificaciones", error)
    state = "error"
  }
  return <NotificationBell state={state} />
}
