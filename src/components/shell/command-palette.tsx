"use client"

import {
  Building2,
  LogOut,
  Monitor,
  Moon,
  PackagePlus,
  Plus,
  ShoppingCart,
  Sun,
  UserPlus,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Fragment, createContext, useContext, useEffect, useState, useTransition } from "react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { navigation, settingsNavItem, settingsSections } from "@/config/navigation"
import { routes } from "@/config/routes"
import { useCan, useOrg } from "@/modules/access/components/org-provider"
import { signOut } from "@/modules/auth/application/actions"

type CommandPaletteContextValue = { open: () => void }

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) throw new Error("useCommandPalette must be used within CommandPaletteProvider")
  return context
}

type PaletteEntry = {
  id: string
  label: string
  icon: LucideIcon
  keywords?: string[]
  run: () => void
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setIsOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <CommandPaletteContext value={{ open: () => setIsOpen(true) }}>
      {children}
      <CommandDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Buscar"
        description="Busca secciones, acciones y negocios"
        className="sm:max-w-xl"
      >
        {isOpen ? <PaletteContent close={() => setIsOpen(false)} /> : null}
      </CommandDialog>
    </CommandPaletteContext>
  )
}

function PaletteContent({ close }: { close: () => void }) {
  const router = useRouter()
  const { organization, organizations } = useOrg()
  const can = useCan()
  const { setTheme } = useTheme()
  const [, startTransition] = useTransition()
  const slug = organization.slug

  const go = (href: string) => () => router.push(href)

  const pages: PaletteEntry[] = [...navigation.flatMap((group) => group.items), settingsNavItem]
    .filter((item) => can(item.permission))
    .map((item) => ({ id: item.id, label: item.title, icon: item.icon, keywords: item.keywords, run: go(item.href(slug)) }))

  const settingsPages: PaletteEntry[] = settingsSections
    .filter((section) => !section.permission || can(section.permission))
    .map((section) => ({
      id: `settings-${section.id}`,
      label: `Configuración › ${section.title}`,
      icon: settingsNavItem.icon,
      keywords: [section.description],
      run: go(section.href(slug)),
    }))

  const actions: PaletteEntry[] = [
    ...(can("sales.create")
      ? [{ id: "new-sale", label: "Nueva venta", icon: ShoppingCart, keywords: ["vender", "cobrar", "factura"], run: go(`${routes.org.sales(slug)}?new=1`) }]
      : []),
    ...(can("products.write")
      ? [{ id: "new-product", label: "Nuevo producto", icon: PackagePlus, keywords: ["catálogo", "precio", "costo"], run: go(`${routes.org.products(slug)}?new=1`) }]
      : []),
    ...(can("customers.write")
      ? [{ id: "new-customer", label: "Nuevo cliente", icon: UserRoundPlus, keywords: ["comprador", "contacto"], run: go(`${routes.org.customers(slug)}?new=1`) }]
      : []),
    ...(can("members.manage")
      ? [{ id: "invite", label: "Invitar a un miembro", icon: UserPlus, keywords: ["equipo", "empleado"], run: go(`${routes.org.members(slug)}?invite=1`) }]
      : []),
    { id: "new-org", label: "Crear otro negocio", icon: Plus, run: go(routes.onboarding) },
  ]

  const switchOrganizations: PaletteEntry[] = organizations
    .filter((item) => item.slug !== slug)
    .map((item) => ({
      id: `org-${item.id}`,
      label: `Cambiar a ${item.name}`,
      icon: Building2,
      run: go(routes.org.dashboard(item.slug)),
    }))

  const preferences: PaletteEntry[] = [
    { id: "theme-light", label: "Apariencia clara", icon: Sun, keywords: ["tema", "modo"], run: () => setTheme("light") },
    { id: "theme-dark", label: "Apariencia oscura", icon: Moon, keywords: ["tema", "modo"], run: () => setTheme("dark") },
    { id: "theme-system", label: "Apariencia automática", icon: Monitor, keywords: ["tema", "sistema"], run: () => setTheme("system") },
    { id: "sign-out", label: "Cerrar sesión", icon: LogOut, keywords: ["salir"], run: () => startTransition(() => signOut()) },
  ]

  const groups = [
    { heading: "Ir a", entries: [...pages, ...settingsPages] },
    { heading: "Acciones", entries: actions },
    { heading: "Negocios", entries: switchOrganizations },
    { heading: "Preferencias", entries: preferences },
  ].filter((group) => group.entries.length > 0)

  return (
    <Command className="bg-transparent">
      <CommandInput placeholder="¿Qué quieres hacer?" />
      <CommandList className="max-h-[min(420px,60vh)]">
        <CommandEmpty>No encontramos resultados.</CommandEmpty>
        {groups.map((group, index) => (
          <Fragment key={group.heading}>
            {index > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={group.heading}>
              {group.entries.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={`${entry.label} ${entry.keywords?.join(" ") ?? ""}`}
                  onSelect={() => {
                    close()
                    entry.run()
                  }}
                >
                  <entry.icon />
                  {entry.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Fragment>
        ))}
      </CommandList>
    </Command>
  )
}
