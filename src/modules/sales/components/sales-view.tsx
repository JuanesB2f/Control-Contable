"use client"

import { ChevronRight, CircleCheck, HandCoins, Plus, Receipt, SearchX } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { SearchField } from "@/components/data/search-field"
import { SegmentedControl } from "@/components/data/segmented-control"
import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useOrgFormat } from "@/hooks/use-org-format"
import { matchesSearch } from "@/lib/search"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"
import { localDateKey } from "@/modules/analytics/domain/period"
import type { Product } from "@/modules/products/domain/types"

import { dueStatus, type DueStatus } from "../domain/due-dates"
import { balanceDue } from "../domain/payments"
import type { Sale } from "../domain/schemas"
import type { CustomerOption } from "./customer-picker"
import { DueBadge } from "./due-date"
import { NewSaleDialog } from "./new-sale-dialog"
import { PAYMENT_ICONS } from "./payment-icons"
import { SaleDetailSheet } from "./sale-detail-sheet"

type StatusFilter = "all" | "completed" | "pending" | "voided"

const STATUS_OPTIONS = [
  { value: "all" as const, label: "Todas" },
  { value: "completed" as const, label: "Completadas" },
  { value: "pending" as const, label: "Por cobrar" },
  { value: "voided" as const, label: "Anuladas" },
]

const DUE_GROUPS: { key: string; label: string; statuses: DueStatus[] }[] = [
  { key: "overdue", label: "Vencidas", statuses: ["overdue"] },
  { key: "soon", label: "Vencen hoy o en los próximos días", statuses: ["today", "soon"] },
  { key: "upcoming", label: "Más adelante", statuses: ["upcoming"] },
  { key: "none", label: "Sin fecha de pago", statuses: ["none"] },
]

type SalesViewProps = {
  sales: Sale[]
  /** Completed sales with a balance, from any date. */
  receivables: Sale[]
  products: Product[]
  customers: CustomerOption[] | null
  openNew: boolean
  /** Local calendar days computed on the server, to label "Hoy" and "Ayer". */
  todayKey: string
  yesterdayKey: string
}

export function SalesView({ sales, receivables, products, customers, openNew, todayKey, yesterdayKey }: SalesViewProps) {
  const { organization } = useOrg()
  const can = useCan()
  const format = useOrgFormat()
  const router = useRouter()
  const pathname = usePathname()
  const canCreate = can("sales.create")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(openNew && canCreate)
  const [lastOpenNew, setLastOpenNew] = useState(openNew)
  if (openNew !== lastOpenNew) {
    setLastOpenNew(openNew)
    if (openNew && canCreate) setNewOpen(true)
  }

  const pendingView = status === "pending"
  const selected = sales.find((sale) => sale.id === selectedId) ?? receivables.find((sale) => sale.id === selectedId) ?? null
  const visible = (pendingView ? receivables : sales).filter(
    (sale) =>
      (status === "all" || pendingView || sale.status === status) &&
      matchesSearch(query, `#${sale.number}`, String(sale.number), sale.customerName, sale.sellerName, ...sale.items.map((item) => item.name)),
  )
  const totalOwed = receivables.reduce((sum, sale) => sum + balanceDue(sale.total, sale.paidTotal), 0)
  const debtors = new Set(receivables.map((sale) => sale.customerId ?? sale.id)).size
  const overdue = receivables.filter((sale) => dueStatus(sale.dueDate, todayKey).status === "overdue")
  const overdueTotal = overdue.reduce((sum, sale) => sum + balanceDue(sale.total, sale.paidTotal), 0)

  const dayFormatter = new Intl.DateTimeFormat(organization.locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: organization.timezone,
  })
  const timeFormatter = new Intl.DateTimeFormat(organization.locale, { timeStyle: "short", timeZone: organization.timezone })

  const soldOnFormatter = new Intl.DateTimeFormat(organization.locale, { day: "numeric", month: "short", timeZone: organization.timezone })

  const days: { key: string; label: string; total: number; sales: Sale[] }[] = []
  if (pendingView) {
    for (const group of DUE_GROUPS) {
      const groupSales = visible.filter((sale) => group.statuses.includes(dueStatus(sale.dueDate, todayKey).status))
      if (groupSales.length === 0) continue
      days.push({
        key: group.key,
        label: group.label,
        total: groupSales.reduce((sum, sale) => sum + balanceDue(sale.total, sale.paidTotal), 0),
        sales: groupSales,
      })
    }
  } else {
    for (const sale of visible) {
      const key = localDateKey(new Date(sale.soldAt), organization.timezone)
      let day = days.at(-1)
      if (!day || day.key !== key) {
        const label = key === todayKey ? "Hoy" : key === yesterdayKey ? "Ayer" : dayFormatter.format(new Date(sale.soldAt))
        day = { key, label, total: 0, sales: [] }
        days.push(day)
      }
      day.sales.push(sale)
      if (sale.status === "completed") day.total += sale.total
    }
  }

  const closeNew = (open: boolean) => {
    setNewOpen(open)
    if (!open && openNew) router.replace(pathname, { scroll: false })
  }

  const newSaleDialog = canCreate ? (
    <NewSaleDialog open={newOpen} onOpenChange={closeNew} products={products} customers={customers} />
  ) : null

  if (sales.length === 0 && receivables.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Receipt}
          title="Sin ventas en este periodo"
          description={
            products.length === 0
              ? "Primero agrega tus productos; luego registra cada venta y el inventario se descuenta solo."
              : "Registra cada venta y verás aquí el total, la ganancia y quién compró."
          }
          action={
            canCreate && products.length > 0 ? (
              <Button onClick={() => setNewOpen(true)}>
                <Plus data-icon="inline-start" />
                Registrar venta
              </Button>
            ) : null
          }
        />
        {newSaleDialog}
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField value={query} onValueChange={setQuery} placeholder="Buscar por número, cliente o producto" className="sm:max-w-sm" />
        <SegmentedControl
          value={status}
          onValueChange={setStatus}
          options={STATUS_OPTIONS}
          label="Estado de la venta"
          className="grid grid-cols-4 sm:inline-flex"
        />
        {canCreate ? (
          <Button onClick={() => setNewOpen(true)} className="max-sm:w-full sm:ml-auto">
            <Plus data-icon="inline-start" />
            Nueva venta
          </Button>
        ) : null}
      </div>

      {pendingView && receivables.length > 0 ? (
        <Card className="flex-row items-center gap-3 px-4 py-3.5 sm:px-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <HandCoins className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Te deben {format.money(totalOwed)}</p>
            <p className="text-xs text-muted-foreground">
              {receivables.length} {receivables.length === 1 ? "venta" : "ventas"} de {debtors} {debtors === 1 ? "cliente" : "clientes"}, de cualquier fecha.
              Abre una para registrar un abono.
            </p>
            {overdue.length > 0 ? (
              <p className="mt-1 text-xs font-medium text-destructive">
                {overdue.length} {overdue.length === 1 ? "vencida" : "vencidas"} por {format.money(overdueTotal)}
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {days.length === 0 ? (
        <Card>
          {pendingView && receivables.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Nadie te debe" description="Todas tus ventas están pagadas por completo." />
          ) : (
            <EmptyState icon={SearchX} title="Sin resultados" description="Prueba con otra búsqueda o estado." />
          )}
        </Card>
      ) : (
        days.map((day) => (
          <section key={day.key} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-[13px] font-semibold capitalize">{day.label}</h2>
              <span className="text-xs text-muted-foreground tabular-nums">{format.money(day.total)}</span>
            </div>
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-border/70">
                {day.sales.map((sale) => {
                  const Icon = PAYMENT_ICONS[sale.paymentMethod]
                  const voided = sale.status === "voided"
                  const owed = voided ? 0 : balanceDue(sale.total, sale.paidTotal)
                  const summary = sale.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")
                  return (
                    <li key={sale.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(sale.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:px-5"
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            voided ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                          )}
                        >
                          <Icon className="size-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 truncate text-sm font-medium">
                            <span className="text-muted-foreground tabular-nums">#{sale.number}</span>
                            <span className="truncate">{sale.customerName ?? "Mostrador"}</span>
                            {voided ? (
                              <span className="rounded-full bg-destructive/10 px-1.5 py-px text-[10px] font-medium text-destructive">Anulada</span>
                            ) : null}
                            {owed > 0 ? (
                              <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-px text-[10px] font-medium text-warning tabular-nums">
                                Debe {format.money(owed)}
                              </span>
                            ) : null}
                          </p>
                          {owed > 0 ? <DueBadge dueDate={sale.dueDate} todayKey={todayKey} className="mt-1" /> : null}
                          <p className="truncate text-xs text-muted-foreground">
                            {pendingView ? `Vendida el ${soldOnFormatter.format(new Date(sale.soldAt))}` : timeFormatter.format(new Date(sale.soldAt))} ·{" "}
                            {summary}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={cn("text-sm font-semibold tabular-nums", voided && "text-muted-foreground line-through")}>
                            {format.money(sale.total)}
                          </p>
                          {sale.profit !== null && !voided ? (
                            <p className={cn("text-xs tabular-nums", sale.profit >= 0 ? "text-success" : "text-destructive")}>
                              {sale.profit >= 0 ? "+" : "−"}
                              {format.money(Math.abs(sale.profit))}
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </section>
        ))
      )}

      <SaleDetailSheet
        sale={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
      {newSaleDialog}
    </div>
  )
}
