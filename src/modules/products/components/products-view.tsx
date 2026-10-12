"use client"

import { ChevronRight, Package, Plus, SearchX } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { SearchField } from "@/components/data/search-field"
import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useOrgFormat } from "@/hooks/use-org-format"
import { matchesSearch } from "@/lib/search"
import { cn } from "@/lib/utils"
import { useCan } from "@/modules/access/components/org-provider"
import { marginRatio } from "../domain/pricing"
import type { Product } from "../domain/types"
import { MarginBadge } from "./margin-badge"
import { ProductFormDialog } from "./product-form-dialog"
import { ProductImage } from "./product-image"

type DialogState = { open: false } | { open: true; product: Product | null }

export function ProductsView({ products, openNew }: { products: Product[]; openNew: boolean }) {
  const can = useCan()
  const format = useOrgFormat()
  const router = useRouter()
  const pathname = usePathname()
  const canWrite = can("products.write")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(openNew && canWrite ? { open: true, product: null } : { open: false })
  const [lastOpenNew, setLastOpenNew] = useState(openNew)
  if (openNew !== lastOpenNew) {
    setLastOpenNew(openNew)
    if (openNew && canWrite) setDialog({ open: true, product: null })
  }

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value)))].sort(),
    [products],
  )

  const visible = products.filter(
    (product) =>
      (showInactive || product.isActive) &&
      (!category || product.category === category) &&
      matchesSearch(query, product.name, product.sku, product.category),
  )

  const closeDialog = (open: boolean) => {
    if (open) return
    setDialog({ open: false })
    if (openNew) router.replace(pathname, { scroll: false })
  }

  if (products.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Package}
          title="Tu catálogo está vacío"
          description="Agrega tus productos con su costo y precio de venta. Así sabrás cuánto ganas en cada venta."
          action={
            canWrite ? (
              <Button onClick={() => setDialog({ open: true, product: null })}>
                <Plus data-icon="inline-start" />
                Agregar el primer producto
              </Button>
            ) : null
          }
        />
        <ProductFormDialog
          open={dialog.open}
          onOpenChange={closeDialog}
          product={dialog.open ? dialog.product : null}
          categories={categories}
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField value={query} onValueChange={setQuery} placeholder="Buscar por nombre, código o categoría" className="sm:max-w-sm" />
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground sm:ml-auto">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} size="sm" />
          Ver desactivados
        </label>
        {canWrite ? (
          <Button onClick={() => setDialog({ open: true, product: null })} className="max-sm:w-full">
            <Plus data-icon="inline-start" />
            Nuevo producto
          </Button>
        ) : null}
      </div>

      {categories.length > 0 ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
          {[null, ...categories].map((value) => (
            <button
              key={value ?? "all"}
              type="button"
              onClick={() => setCategory(value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
                category === value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {value ?? "Todas"}
            </button>
          ))}
        </div>
      ) : null}

      <Card className="gap-0 py-0">
        {visible.length === 0 ? (
          <EmptyState icon={SearchX} title="Sin resultados" description="Prueba con otra palabra o categoría." />
        ) : (
          <ul className="divide-y divide-border/70">
            {visible.map((product) => {
              const margin = product.costPrice === null ? null : marginRatio(product.costPrice, product.salePrice)
              const content = (
                <>
                  <ProductImage name={product.name} url={product.imageUrl} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", !product.isActive && "text-muted-foreground line-through")}>
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[product.category, product.sku].filter(Boolean).join(" · ") || "Sin categoría"}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-sm font-semibold tabular-nums">{format.money(product.salePrice)}</p>
                    {product.costPrice !== null ? (
                      <p className="text-xs text-muted-foreground tabular-nums">Costo {format.money(product.costPrice)}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:w-24">
                    <span className="text-sm font-semibold tabular-nums sm:hidden">{format.money(product.salePrice)}</span>
                    {margin !== null ? <MarginBadge ratio={margin} label={format.percent(margin)} /> : null}
                  </div>
                  {canWrite ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
                </>
              )

              return (
                <li key={product.id}>
                  {canWrite ? (
                    <button
                      type="button"
                      onClick={() => setDialog({ open: true, product })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:px-5"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <ProductFormDialog
        open={dialog.open}
        onOpenChange={closeDialog}
        product={dialog.open ? dialog.product : null}
        categories={categories}
      />
    </div>
  )
}
