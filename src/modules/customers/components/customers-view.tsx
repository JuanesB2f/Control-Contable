"use client"

import { ChevronRight, Crown, Plus, SearchX, Users } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { SearchField } from "@/components/data/search-field"
import { UserAvatar } from "@/components/data/user-avatar"
import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useOrgFormat } from "@/hooks/use-org-format"
import { matchesSearch } from "@/lib/search"
import { cn } from "@/lib/utils"
import { useCan } from "@/modules/access/components/org-provider"

import type { Customer } from "../domain/schemas"
import { CUSTOMER_SEGMENTS, SEGMENT_INFO, type CustomerSegment } from "../domain/segments"
import { CustomerDetailSheet } from "./customer-detail-sheet"
import { CustomerFormDialog } from "./customer-form-dialog"
import { SegmentBadge } from "./segment-badge"

export type CustomerRow = Customer & {
  segment: CustomerSegment
  /** Relative label computed on the server so it matches between renders. */
  lastPurchaseLabel: string | null
  sinceLabel: string
}

type FormState = { open: false } | { open: true; customer: CustomerRow | null }

const PODIUM_STYLE = [
  { order: "order-2", height: "h-24", medal: "bg-chart-3 text-white", label: "1" },
  { order: "order-1", height: "h-16", medal: "bg-[#b0b4ba] text-white", label: "2" },
  { order: "order-3", height: "h-12", medal: "bg-[#c98a4b] text-white", label: "3" },
]

export function CustomersView({ customers, openNew }: { customers: CustomerRow[]; openNew: boolean }) {
  const can = useCan()
  const format = useOrgFormat()
  const router = useRouter()
  const pathname = usePathname()
  const canWrite = can("customers.write")
  const [query, setQuery] = useState("")
  const [segment, setSegment] = useState<CustomerSegment | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(openNew && canWrite ? { open: true, customer: null } : { open: false })
  const [lastOpenNew, setLastOpenNew] = useState(openNew)
  if (openNew !== lastOpenNew) {
    setLastOpenNew(openNew)
    if (openNew && canWrite) setForm({ open: true, customer: null })
  }

  const selected = customers.find((customer) => customer.id === selectedId) ?? null
  const counts = new Map<CustomerSegment, number>()
  for (const customer of customers) counts.set(customer.segment, (counts.get(customer.segment) ?? 0) + 1)

  const podium = customers
    .filter((customer) => customer.totalSpent > 0)
    .toSorted((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 3)

  const visible = customers
    .filter((customer) => !segment || customer.segment === segment)
    .filter((customer) => matchesSearch(query, customer.name, customer.phone, customer.email, customer.document))

  const closeForm = (open: boolean) => {
    if (open) return
    setForm({ open: false })
    if (openNew) router.replace(pathname, { scroll: false })
  }

  const formDialog = (
    <CustomerFormDialog open={form.open} onOpenChange={closeForm} customer={form.open ? form.customer : null} />
  )

  if (customers.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title="Aún no tienes clientes"
          description="Regístralos aquí o directamente al hacer una venta. Así sabrás quién te compra más y a quién no ves hace rato."
          action={
            canWrite ? (
              <Button onClick={() => setForm({ open: true, customer: null })}>
                <Plus data-icon="inline-start" />
                Agregar cliente
              </Button>
            ) : null
          }
        />
        {formDialog}
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {podium.length > 0 ? (
        <Card className="gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-chart-3" />
            <h2 className="text-[15px] font-semibold">Tu podio</h2>
            <span className="text-xs text-muted-foreground">Quienes más te han comprado</span>
          </div>
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {podium.map((customer, index) => {
              const style = PODIUM_STYLE[index]
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedId(customer.id)}
                  className={cn("group flex min-w-0 flex-col items-center gap-2 text-center", style.order)}
                >
                  <div className="relative">
                    <UserAvatar name={customer.name} className={cn(index === 0 ? "size-14" : "size-11", "ring-2 ring-background")} />
                    <span
                      className={cn(
                        "absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-card",
                        style.medal,
                      )}
                    >
                      {style.label}
                    </span>
                  </div>
                  <div className="w-full min-w-0">
                    <p className="truncate text-[13px] font-medium group-hover:text-primary">{customer.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{format.compact(customer.totalSpent)}</p>
                  </div>
                  <div
                    className={cn(
                      "w-full rounded-t-xl bg-linear-to-b",
                      index === 0 ? "from-primary/25 to-primary/5" : "from-primary/15 to-primary/5",
                      style.height,
                    )}
                  />
                </button>
              )
            })}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField value={query} onValueChange={setQuery} placeholder="Buscar por nombre, teléfono o documento" className="sm:max-w-sm" />
        {canWrite ? (
          <Button onClick={() => setForm({ open: true, customer: null })} className="max-sm:w-full sm:ml-auto">
            <Plus data-icon="inline-start" />
            Nuevo cliente
          </Button>
        ) : null}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        {[null, ...CUSTOMER_SEGMENTS.filter((value) => counts.has(value))].map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            onClick={() => setSegment(value)}
            title={value ? SEGMENT_INFO[value].description : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
              segment === value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {value ? SEGMENT_INFO[value].label : "Todos"}
            <span className={cn("tabular-nums", segment === value ? "text-primary-foreground/75" : "text-muted-foreground")}>
              {value ? counts.get(value) : customers.length}
            </span>
          </button>
        ))}
      </div>

      <Card className="gap-0 py-0">
        {visible.length === 0 ? (
          <EmptyState icon={SearchX} title="Sin resultados" description="Prueba con otra palabra o segmento." />
        ) : (
          <ul className="divide-y divide-border/70">
            {visible.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(customer.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:px-5"
                >
                  <UserAvatar name={customer.name} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{customer.name}</p>
                      <SegmentBadge segment={customer.segment} className="max-sm:hidden" />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {customer.orders > 0
                        ? `${format.number(customer.orders)} ${customer.orders === 1 ? "compra" : "compras"} · última ${customer.lastPurchaseLabel}`
                        : (customer.phone ?? "Sin compras todavía")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{format.money(customer.totalSpent)}</span>
                    {customer.balanceDue > 0 ? (
                      <span className="rounded-full bg-warning/15 px-1.5 py-px text-[10px] font-medium text-warning tabular-nums">
                        Debe {format.money(customer.balanceDue)}
                      </span>
                    ) : null}
                    <SegmentBadge segment={customer.segment} className="sm:hidden" />
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CustomerDetailSheet
        customer={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onEdit={(customer) => {
          setSelectedId(null)
          setForm({ open: true, customer })
        }}
      />
      {formDialog}
    </div>
  )
}
