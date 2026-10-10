import { PackageCheck } from "lucide-react"
import Link from "next/link"

import { Meter } from "@/components/data/meter"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { coverageDays, stockStatus } from "@/modules/inventory/domain/stock"
import { ProductImage } from "@/modules/products/components/product-image"
import type { Product } from "@/modules/products/domain/types"

export function LowStockCard({ products, href }: { products: Product[]; href: string }) {
  const low = products
    .filter((product) => product.isActive && stockStatus(product.stock, product.minStock) !== "ok")
    .map((product) => ({ product, days: coverageDays(product.stock, product.unitsSold30d) }))
    .toSorted((a, b) => a.product.stock - b.product.stock)
    .slice(0, 5)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Por reabastecer</CardTitle>
        <CardDescription>Agotados o en su mínimo</CardDescription>
        <CardAction>
          <Link href={href} className="text-[13px] font-medium text-primary hover:underline">
            Inventario
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {low.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-success/8 p-3 text-sm">
            <PackageCheck className="size-5 shrink-0 text-success" />
            Todo tu inventario está por encima del mínimo.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {low.map(({ product, days }) => (
              <li key={product.id} className="flex items-center gap-3">
                <ProductImage name={product.name} url={product.imageUrl} className="size-9 rounded-lg" sizes="36px" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{product.name}</span>
                    <span className={product.stock <= 0 ? "shrink-0 text-xs font-medium text-destructive" : "shrink-0 text-xs text-warning tabular-nums"}>
                      {product.stock <= 0 ? "Agotado" : `${product.stock} u.${days !== null ? ` · ~${days} d` : ""}`}
                    </span>
                  </div>
                  <Meter
                    value={product.minStock > 0 ? product.stock / (product.minStock * 2) : 0}
                    tone={product.stock <= 0 ? "destructive" : "warning"}
                    label={`Stock de ${product.name}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
