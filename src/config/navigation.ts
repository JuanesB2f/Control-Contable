import { Boxes, LayoutGrid, Package, Settings, ShoppingBag, Users, Wallet, type LucideIcon } from "lucide-react"

import type { Permission } from "@/modules/access/domain/permissions"

import { routes } from "./routes"

export type NavItem = {
  id: string
  title: string
  icon: LucideIcon
  permission: Permission
  href: (slug: string) => string
  keywords?: string[]
  /** Shown in the mobile tab bar. */
  mobile?: boolean
}

export type NavGroup = { id: string; label?: string; items: NavItem[] }

export const navigation: NavGroup[] = [
  {
    id: "main",
    items: [
      {
        id: "dashboard",
        title: "Inicio",
        icon: LayoutGrid,
        permission: "dashboard.read",
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
      {
        id: "sales",
        title: "Ventas",
        icon: ShoppingBag,
        permission: "sales.read",
        href: routes.org.sales,
        keywords: ["vender", "factura", "caja", "pos"],
        mobile: true,
      },
      {
        id: "customers",
        title: "Clientes",
        icon: Users,
        permission: "customers.read",
        href: routes.org.customers,
        keywords: ["compradores", "contactos"],
        mobile: true,
      },
      {
        id: "products",
        title: "Productos",
        icon: Package,
        permission: "products.read",
        href: routes.org.products,
        keywords: ["catálogo", "precios", "margen"],
      },
      {
        id: "inventory",
        title: "Inventario",
        icon: Boxes,
        permission: "inventory.read",
        href: routes.org.inventory,
        keywords: ["stock", "existencias", "compras"],
      },
    ],
  },
  {
    id: "insights",
    label: "Análisis",
    items: [
      {
        id: "finance",
        title: "Finanzas",
        icon: Wallet,
        permission: "finance.read",
        href: routes.org.finance,
        keywords: ["gastos", "ganancias", "utilidad", "flujo de caja"],
      },
    ],
  },
]

export const settingsNavItem: NavItem = {
  id: "settings",
  title: "Configuración",
  icon: Settings,
  permission: "dashboard.read",
  href: routes.org.settings,
  keywords: ["ajustes", "preferencias", "negocio"],
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
