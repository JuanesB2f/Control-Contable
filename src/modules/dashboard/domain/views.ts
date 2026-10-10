import type { Permission } from "@/modules/access/domain/permissions"

export const DASHBOARD_VIEWS = ["overview", "sales", "finance", "inventory", "customers"] as const
export type DashboardView = (typeof DASHBOARD_VIEWS)[number]

export const DASHBOARD_VIEW_INFO: Record<DashboardView, { label: string; permission: Permission; usesPeriod: boolean }> = {
  overview: { label: "Resumen", permission: "dashboard.read", usesPeriod: true },
  sales: { label: "Ventas", permission: "sales.read", usesPeriod: true },
  finance: { label: "Finanzas", permission: "finance.read", usesPeriod: true },
  inventory: { label: "Inventario", permission: "products.read", usesPeriod: false },
  customers: { label: "Clientes", permission: "customers.read", usesPeriod: false },
}

/** The requested view if the member may see it, otherwise the overview. */
export function resolveDashboardView(value: unknown, allowed: readonly DashboardView[]): DashboardView {
  return allowed.find((view) => view === value) ?? "overview"
}

/** Search params for a dashboard link; the overview is the bare URL. */
export function dashboardParams(view: DashboardView, period?: string): Record<string, string> {
  return {
    ...(view === "overview" ? {} : { view }),
    ...(period && DASHBOARD_VIEW_INFO[view].usesPeriod ? { period } : {}),
  }
}
