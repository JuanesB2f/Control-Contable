"use client"

import { Boxes, Ellipsis, PackagePlus, SearchX, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Meter } from "@/components/data/meter"
import { SearchField } from "@/components/data/search-field"
import { SegmentedControl } from "@/components/data/segmented-control"
import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { routes } from "@/config/routes"
import { useOrgFormat } from "@/hooks/use-org-format"
import { matchesSearch } from "@/lib/search"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"
import { ProductPhotoButton } from "@/modules/products/components/product-photo-button"
import type { Product } from "@/modules/products/domain/types"

import { STOCK_STATUS_LABELS, coverageDays, stockStatus, type StockStatus } from "../domain/stock"
import { StockEntryDialog, type StockEntryMode } from "./stock-entry-dialog"

type Filter = "all" | "attention" | "out"

const FILTERS = [
  { value: "all" as const, label: "Todos" },
  { value: "attention" as const, label: "Por reabastecer" },
  { value: "out" as const, label: "Agotados" },
]

const METER_TONE: Record<StockStatus, "destructive" | "warning" | "success"> = {
  out: "destructive",
  low: "warning",
  ok: "success",
}

function coverageText(days: number | null) {
  if (days === null) return "Sin ventas en 30 días"
  if (days <= 0) return "Se agota hoy"
  if (days > 365) return "Te alcanza para más de un año"
  return `Te alcanza para ~${days} ${days === 1 ? "día" : "días"}`
}

export function InventoryView({ products }: { products: Product[] }) {
  const can = useCan()
  const { organization } = useOrg()
  const format = useOrgFormat()
  const canAdjust = can("inventory.adjust")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [entry, setEntry] = useState<{ product: Product; mode: StockEntryMode } | null>(null)

  const active = products.filter((product) => product.isActive)
  const visible = active
    .filter((product) => {
      const status = stockStatus(product.stock, product.minStock)
      if (filter === "out") return status === "out"
      if (filter === "attention") return status !== "ok"
      return true
    })
    .filter((product) => matchesSearch(query, product.name, product.sku, product.category))
    .sort((a, b) => (coverageDays(a.stock, a.unitsSold30d) ?? Infinity) - (coverageDays(b.stock, b.unitsSold30d) ?? Infinity))

  if (active.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Boxes}
          title="No hay productos para inventariar"
          description="Primero agrega tus productos; luego aquí registras compras y controlas existencias."
          action={
            can("products.write") ? (
              <Button asChild>
                <Link href={`${routes.org.products(organization.slug)}?new=1`}>Agregar producto</Link>
              </Button>
            ) : null
          }
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchField value={query} onValueChange={setQuery} placeholder="Buscar producto" className="sm:max-w-xs" />
        <SegmentedControl value={filter} onValueChange={setFilter} options={FILTERS} label="Filtrar existencias" className="self-start" />
      </div>

      <Card className="gap-0 py-0">
        {visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={filter === "all" ? "Sin resultados" : "Nada por aquí"}
            description={filter === "all" ? "Prueba con otra palabra." : "Ningún producto necesita reabastecerse."}
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {visible.map((product) => {
              const status = stockStatus(product.stock, product.minStock)
              const days = coverageDays(product.stock, product.unitsSold30d)
              const scale = Math.max(product.minStock * 3, product.stock, 1)
              return (
                <li key={product.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <ProductPhotoButton product={product} className="size-12 sm:size-14" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {format.number(product.stock)} <span className="text-xs font-normal text-muted-foreground">u.</span>
                      </p>
                    </div>
                    <Meter value={product.stock / scale} tone={METER_TONE[status]} label={`Stock de ${product.name}`} />
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className={cn(status !== "ok" && "font-medium", status === "out" && "text-destructive", status === "low" && "text-warning")}>
                        {status === "ok" ? coverageText(days) : `${STOCK_STATUS_LABELS[status]} · ${coverageText(days).toLowerCase()}`}
                      </span>
                      <span className="tabular-nums">
                        Mínimo {format.number(product.minStock)}
                        {product.costPrice !== null ? ` · invertido ${format.money(product.stock * product.costPrice)}` : ""}
                      </span>
                    </div>
                  </div>
                  {canAdjust ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 max-sm:size-10 max-sm:rounded-xl max-sm:px-0"
                        onClick={() => setEntry({ product, mode: "purchase" })}
                        aria-label={`Registrar compra de ${product.name}`}
                      >
                        <PackagePlus data-icon="inline-start" className="max-sm:text-primary" />
                        <span className="max-sm:sr-only">Compra</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Opciones de ${product.name}`}>
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onSelect={() => setEntry({ product, mode: "purchase" })}>
                            <PackagePlus />
                            Registrar compra
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setEntry({ product, mode: "adjustment" })}>
                            <SlidersHorizontal />
                            Ajustar conteo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <StockEntryDialog
        product={entry?.product ?? null}
        mode={entry?.mode ?? "purchase"}
        onOpenChange={(open) => {
          if (!open) setEntry(null)
        }}
      />
    </div>
  )
}
