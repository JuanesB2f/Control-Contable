"use client"

import { Check, ChevronRight, LogOut, Plus } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTransition } from "react"

import { OrgAvatar } from "@/components/data/org-avatar"
import { UserAvatar } from "@/components/data/user-avatar"
import { THEME_OPTIONS } from "@/components/theme/theme-options"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { navigation, settingsNavItem } from "@/config/navigation"
import { routes } from "@/config/routes"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"
import { ROLE_LABELS } from "@/modules/access/domain/permissions"
import { signOut } from "@/modules/auth/application/actions"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="px-1 pb-2 text-[13px] font-medium text-muted-foreground">{children}</p>
}

/** Everything that doesn't fit in the tab bar, in a sheet that rises from the bottom. */
export function MoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname()
  const { user, organization, organizations, role } = useOrg()
  const can = useCan()
  const { theme, setTheme } = useTheme()
  const [signingOut, startSignOut] = useTransition()
  const displayName = user.fullName ?? user.email
  const close = () => onOpenChange(false)

  const sections = [...navigation.flatMap((group) => group.items).filter((item) => !item.mobile), settingsNavItem].filter((item) =>
    can(item.permission),
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh] rounded-t-[28px]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Más opciones</DrawerTitle>
          <DrawerDescription>Secciones, apariencia y tu cuenta</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <Link
            href={routes.org.profile(organization.slug)}
            onClick={close}
            className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3 transition-transform active:scale-[0.98]"
          >
            <UserAvatar name={displayName} imageUrl={user.avatarUrl} className="size-11" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{displayName}</span>
              <span className="block truncate text-[13px] text-muted-foreground">Ver tu perfil</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          {sections.length > 0 ? (
            <section>
              <SectionTitle>Secciones</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {sections.map((item) => {
                  const href = item.href(organization.slug)
                  const active = pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-w-0 items-center gap-3 rounded-2xl bg-muted/60 p-2.5 text-[15px] font-medium transition-transform active:scale-95",
                        active && "bg-primary/10 text-primary",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm",
                          active && "bg-primary text-primary-foreground",
                        )}
                      >
                        <item.icon className="size-5" strokeWidth={1.75} />
                      </span>
                      <span className="truncate">{item.title}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section>
            <SectionTitle>Apariencia</SectionTitle>
            <div role="radiogroup" aria-label="Apariencia" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted/60 p-1">
              {THEME_OPTIONS.map((option) => {
                const selected = (theme ?? "system") === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl py-2.5 text-[13px] font-medium text-muted-foreground transition-all active:scale-95",
                      selected && "bg-background text-foreground shadow-sm",
                    )}
                  >
                    <option.icon className="size-5" strokeWidth={1.75} />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <SectionTitle>{organizations.length > 1 ? "Tus negocios" : "Tu negocio"}</SectionTitle>
            <div className="overflow-hidden rounded-2xl bg-muted/60">
              {organizations.map((item) => {
                const current = item.slug === organization.slug
                return (
                  <Link
                    key={item.id}
                    href={routes.org.dashboard(item.slug)}
                    onClick={close}
                    className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 transition-colors active:bg-muted"
                  >
                    <OrgAvatar name={item.name} seed={item.id} className="size-8 text-[11px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{item.name}</span>
                      {current ? <span className="block text-xs text-muted-foreground">{ROLE_LABELS[role]}</span> : null}
                    </span>
                    {current ? <Check className="size-4 text-primary" /> : null}
                  </Link>
                )
              })}
              <Link href={routes.onboarding} onClick={close} className="flex items-center gap-3 px-3 py-2.5 text-[15px] text-primary transition-colors active:bg-muted">
                <span className="flex size-8 items-center justify-center rounded-[28%] border border-dashed border-primary/50">
                  <Plus className="size-4" />
                </span>
                Crear negocio
              </Link>
            </div>
          </section>

          <button
            type="button"
            disabled={signingOut}
            onClick={() => startSignOut(() => signOut())}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-destructive/10 text-[15px] font-medium text-destructive transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
