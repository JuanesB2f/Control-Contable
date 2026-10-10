"use client"

import { ChevronRight, PackagePlus, Plus, SearchX } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { SearchField } from "@/components/data/search-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { routes } from "@/config/routes"
import { useOrgFormat } from "@/hooks/use-org-format"
import { matchesSearch } from "@/lib/search"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"
import { ProductImage } from "@/modules/products/components/product-image"
import type { Product } from "@/modules/products/domain/types"

import { STOCK_STATUS_LABELS, stockStatus } from "../domain/stock"
import { StockEntryDialog } from "./stock-entry-dialog"

/** Main way to register a purchase: pick the product, then say how many arrived and what they cost. */
export function AddStockButton({ products }: { products: Product[] }) {
  const can = useCan()
  const { organization } = useOrg()
  const format = useOrgFormat()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [product, setProduct] = useState<Product | null>(null)

  const active = products.filter((item) => item.isActive)
  if (!can("inventory.adjust") || active.length === 0) return null

  const visible = active
    .filter((item) => matchesSearch(query, item.name, item.sku, item.category))
    .sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock))

  const choose = (item: Product) => {
    setPickerOpen(false)
    setQuery("")
    setProduct(item)
  }

  return (
    <>
      <Button onClick={() => setPickerOpen(true)} className="w-full sm:w-auto">
        <PackagePlus data-icon="inline-start" />
        Agregar inventario
      </Button>

      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open)
          if (!open) setQuery("")
        }}
      >
        <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Qué producto llegó?</DialogTitle>
            <DialogDescription>Elige el producto y registra cuántas unidades compraste.</DialogDescription>
          </DialogHeader>
          <SearchField value={query} onValueChange={setQuery} placeholder="Buscar producto" className="h-11 sm:h-9" />
          <div className="-mx-2 min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <SearchX className="size-6" />
                No encontramos “{query}”.
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {visible.map((item) => {
                  const status = stockStatus(item.stock, item.minStock)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => choose(item)}
                        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-muted active:scale-[0.98] active:bg-muted"
                      >
                        <ProductImage name={item.name} url={item.imageUrl} className="size-11" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium sm:text-sm">{item.name}</span>
                          <span
                            className={cn(
                              "block text-xs text-muted-foreground tabular-nums",
                              status === "out" && "font-medium text-destructive",
                              status === "low" && "font-medium text-warning",
                            )}
                          >
                            {status === "ok" ? `${format.number(item.stock)} en stock` : `${STOCK_STATUS_LABELS[status]} · quedan ${format.number(item.stock)}`}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {can("products.write") ? (
            <Button variant="outline" asChild>
              <Link href={`${routes.org.products(organization.slug)}?new=1`}>
                <Plus data-icon="inline-start" />
                Es un producto nuevo
              </Link>
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>

      <StockEntryDialog
        product={product}
        mode="purchase"
        onOpenChange={(open) => {
          if (!open) setProduct(null)
        }}
      />
    </>
  )
}
