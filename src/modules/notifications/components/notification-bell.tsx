"use client"

import { Bell, ChevronRight, CircleCheck, HandCoins, Loader2, PackageX, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useOrg } from "@/modules/access/components/org-provider"

import type { AppNotification } from "../domain/notifications"

export type NotificationsState = AppNotification[] | "loading" | "error"

const SEEN_EVENT = "vitaesme:notifications-seen"

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(SEEN_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(SEEN_EVENT, onChange)
  }
}

/** Ids already looked at, per organization; undefined until the browser can be asked. */
function useSeenIds(storageKey: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(storageKey) ?? "",
    () => undefined,
  )
  const markSeen = (ids: string[]) => {
    window.localStorage.setItem(storageKey, ids.join("\n"))
    window.dispatchEvent(new Event(SEEN_EVENT))
  }
  return { seen: raw === undefined ? undefined : new Set(raw.split("\n")), markSeen }
}

const KIND_ICONS = { receivable: HandCoins, stock: PackageX } as const

const TONE_STYLES = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
} as const

function NotificationList({ state, onNavigate }: { state: NotificationsState; onNavigate: () => void }) {
  if (state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Revisando tu negocio…
      </div>
    )
  }
  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
        <TriangleAlert className="size-6 text-warning" />
        No pudimos cargar tus avisos. Vuelve a intentarlo en un momento.
      </div>
    )
  }
  if (state.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <CircleCheck className="size-8 text-success" />
        <p className="text-sm font-medium">Todo al día</p>
        <p className="text-[13px] text-muted-foreground text-pretty">No hay cobros vencidos ni productos por reabastecer.</p>
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-1 p-2">
      {state.map((notification) => {
        const Icon = KIND_ICONS[notification.kind]
        return (
          <li key={notification.id}>
            <Link
              href={notification.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors hover:bg-muted active:scale-[0.98] active:bg-muted"
            >
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONE_STYLES[notification.tone])}>
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{notification.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{notification.detail}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Bell with a badge for what's new; a bottom sheet on phones and a popover on larger screens. */
export function NotificationBell({ state }: { state: NotificationsState }) {
  const { organization } = useOrg()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const { seen, markSeen } = useSeenIds(`notifications-seen:${organization.id}`)
  const items = Array.isArray(state) ? state : []
  const unseen = seen ? items.filter((notification) => !seen.has(notification.id)).length : 0

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (next && items.length > 0) markSeen(items.map((notification) => notification.id))
  }

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      onClick={isMobile ? () => changeOpen(true) : undefined}
      aria-label={unseen > 0 ? `Notificaciones, ${unseen} sin ver` : "Notificaciones"}
      className="relative text-muted-foreground"
    >
      <Bell />
      {unseen > 0 ? (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-background">
          {unseen > 9 ? "9+" : unseen}
        </span>
      ) : null}
    </Button>
  )

  const subtitle = items.length > 0 ? `${items.length} ${items.length === 1 ? "cosa necesita" : "cosas necesitan"} tu atención` : "Cobros y existencias"

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={changeOpen}>
          <DrawerContent className="max-h-[85dvh] rounded-t-[28px] pb-[env(safe-area-inset-bottom)]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-[17px] font-semibold">Notificaciones</DrawerTitle>
              <DrawerDescription>{subtitle}</DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 overflow-y-auto pb-2">
              <NotificationList state={state} onNavigate={() => setOpen(false)} />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-96 gap-0 rounded-2xl p-0">
        <div className="border-b px-4 py-3">
          <p className="text-[15px] font-semibold">Notificaciones</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="max-h-[min(28rem,70dvh)] overflow-y-auto">
          <NotificationList state={state} onNavigate={() => setOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
