"use client"

import { Trophy } from "lucide-react"
import { useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { SegmentedControl } from "@/components/data/segmented-control"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useOrgFormat } from "@/hooks/use-org-format"
import { cn } from "@/lib/utils"

import type { SalesAnalytics } from "../domain/analytics"

type Metric = "revenue" | "units" | "profit"

const RANK_STYLES = ["bg-chart-3 text-[#4a3700]", "bg-[#cfd8d0] text-[#2f3a31]", "bg-[#e3b98f] text-[#5a3410]"]

export function TopProductsCard({ products, canSeeCosts }: { products: SalesAnalytics["topProducts"]; canSeeCosts: boolean }) {
  const format = useOrgFormat()
  const [metric, setMetric] = useState<Metric>("revenue")

  const options = [
    { value: "revenue" as const, label: "Ventas" },
    { value: "units" as const, label: "Unidades" },
    ...(canSeeCosts ? [{ value: "profit" as const, label: "Ganancia" }] : []),
  ]

  const valueOf = (product: SalesAnalytics["topProducts"][number]) =>
    metric === "units" ? product.units : metric === "profit" ? (product.profit ?? 0) : product.revenue
  const ranked = [...products].sort((a, b) => valueOf(b) - valueOf(a)).slice(0, 6)
  const max = Math.max(1, ...ranked.map(valueOf))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Lo más vendido</CardTitle>
        <CardDescription>Tus productos estrella del periodo</CardDescription>
        {products.length > 0 ? (
          <CardAction>
            <SegmentedControl value={metric} onValueChange={setMetric} options={options} label="Ordenar por" />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {ranked.length === 0 ? (
          <EmptyState icon={Trophy} title="Aún no hay ventas" description="Cuando vendas, aquí verás tus productos estrella." className="py-8" />
        ) : (
          <ol className="flex flex-col gap-3.5">
            {ranked.map((product, index) => {
              const value = valueOf(product)
              return (
                <li key={product.productId ?? product.name} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                      RANK_STYLES[index] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">{product.name}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {metric === "units" ? `${format.number(value)} u.` : format.money(value)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", metric === "profit" ? "bg-chart-3" : "bg-primary")}
                        style={{ width: `${Math.max(4, (Math.max(value, 0) / max) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {format.number(product.units)} u. · {format.money(product.revenue)}
                      {product.profit !== null ? ` · ganancia ${format.money(product.profit)}` : ""}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
