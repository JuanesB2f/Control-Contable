import {
  Boxes,
  FileText,
  LayoutGrid,
  Megaphone,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import type { Permission } from "@/modules/access/domain/permissions"

import { routes } from "./routes"

export type NavItem = {
  id: string
  title: string
  icon: LucideIcon
  permission: Permission
  /** `soon` items are visible in the sidebar to show the product roadmap, but not navigable. */
  status: "available" | "soon"
  href: (slug: string) => string
  keywords?: string[]
  /** Shown in the mobile tab bar. */
  mobile?: boolean
}

export type NavGroup = { id: string; label?: string; items: NavItem[] }

const moduleHref = (segment: string) => (slug: string) => `/${slug}/${segment}`

export const navigation: NavGroup[] = [
  {
    id: "main",
    items: [
      {
        id: "dashboard",
        title: "Inicio",
        icon: LayoutGrid,
        permission: "dashboard.read",
        status: "available",
        href: routes.org.dashboard,
        keywords: ["dashboard", "resumen", "inicio"],
        mobile: true,
      },
    ],
  },
  {
    id: "operations",
    label: "Operación",
    items: [
      { id: "sales", title: "Ventas", icon: ShoppingBag, permission: "sales.read", status: "soon", href: moduleHref("sales") },
      { id: "customers", title: "Clientes", icon: Users, permission: "customers.read", status: "soon", href: moduleHref("customers") },
      { id: "products", title: "Productos", icon: Package, permission: "products.read", status: "soon", href: moduleHref("products") },
      { id: "inventory", title: "Inventario", icon: Boxes, permission: "inventory.read", status: "soon", href: moduleHref("inventory") },
    ],
  },
  {
    id: "insights",
    label: "Análisis",
    items: [
      { id: "finance", title: "Finanzas", icon: Wallet, permission: "finance.read", status: "soon", href: moduleHref("finance") },
      { id: "intelligence", title: "Intelligence", icon: Sparkles, permission: "intelligence.read", status: "soon", href: moduleHref("intelligence") },
      { id: "reports", title: "Reportes", icon: FileText, permission: "reports.read", status: "soon", href: moduleHref("reports") },
    ],
  },
  {
    id: "growth",
    label: "Crecimiento",
    items: [
      { id: "social", title: "Social Hub", icon: Megaphone, permission: "social.manage", status: "soon", href: moduleHref("social") },
    ],
  },
]

export const settingsNavItem: NavItem = {
  id: "settings",
  title: "Configuración",
  icon: Settings,
  permission: "dashboard.read",
  status: "available",
  href: routes.org.settings,
  keywords: ["ajustes", "preferencias", "negocio"],
  mobile: true,
}

export type SettingsSection = {
  id: string
  title: string
  description: string
  href: (slug: string) => string
  permission?: Permission
}

export const settingsSections: SettingsSection[] = [
  {
    id: "organization",
    title: "Negocio",
    description: "Nombre, país, moneda y zona horaria",
    href: routes.org.settings,
  },
  {
    id: "members",
    title: "Equipo",
    description: "Miembros, roles e invitaciones",
    href: routes.org.members,
    permission: "members.read",
  },
  {
    id: "profile",
    title: "Tu perfil",
    description: "Nombre y contraseña",
    href: routes.org.profile,
  },
  {
    id: "activity",
    title: "Actividad",
    description: "Registro de cambios importantes",
    href: routes.org.activity,
    permission: "audit.read",
  },
]