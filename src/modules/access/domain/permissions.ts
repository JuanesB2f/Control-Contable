import type { Enums } from "@/types/database"

export type AppRole = Enums<"app_role">

// Mirror of the `role_permissions` catalog. The database is the source of truth
// for who holds each permission; this list only provides type safety.
export const PERMISSIONS = [
  "dashboard.read",
  "customers.read",
  "customers.write",
  "products.read",
  "products.write",
  "costs.read",
  "inventory.read",
  "inventory.adjust",
  "sales.read",
  "sales.create",
  "sales.void",
  "finance.read",
  "finance.write",
  "intelligence.read",
  "reports.read",
  "social.manage",
  "members.read",
  "members.manage",
  "settings.manage",
  "audit.read",
  "organization.delete",
] as const

export type Permission = (typeof PERMISSIONS)[number]

const permissionSet: ReadonlySet<string> = new Set(PERMISSIONS)

export function isPermission(value: string): value is Permission {
  return permissionSet.has(value)
}

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  employee: "Empleado",
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  owner: "Control total del negocio, incluida la facturación y la eliminación.",
  admin: "Gestiona el equipo, la configuración y todos los módulos.",
  employee: "Registra ventas y clientes. No ve costos, finanzas ni reportes.",
}

/** Roles that can be granted through invitations or role changes. */
export const ASSIGNABLE_ROLES = ["admin", "employee"] as const satisfies readonly AppRole[]
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]
