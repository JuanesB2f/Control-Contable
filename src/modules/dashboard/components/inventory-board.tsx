import { Boxes, Coins, Flame, Gem, Package, Percent, TriangleAlert } from "lucide-react"

import { KpiCard } from "@/components/data/kpi-card"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { routes } from "@/config/routes"
import { createMoneyFormatter } from "@/lib/money"
import { can, type OrgContext } from "@/modules/access/application/org-context"
import { inventoryValuation, stockStatus } from "@/modules/inventory/domain/stock"
import { getProducts } from "@/modules/products/application/queries"
import { marginRatio } from "@/modules/products/domain/pricing"

import { LowStockCard } from "./low-stock-card"

/** Catalog and stock at a glance: money on the shelves, margins and what to restock. */
export async function InventoryBoard({ context }: { context: OrgContext }) {
  const products = await getProducts(context)
  const { organization } = context
  const format = createMoneyFormatter(organization)
  const seesCosts = can(context, "costs.read")
  const active = products.filter((product) => product.isActive)
  const valuation = inventoryValuation(products)
  const toRestock = active.filter((product) => stockStatus(product.stock, product.minStock) !== "ok").length
  const withCost = active.filter((product) => product.costPrice !== null && product.salePrice > 0)
  const averageMargin = withCost.length
    ? withCost.reduce((sum, product) => sum + marginRatio(product.costPrice ?? 0, product.salePrice), 0) / withCost.length
    : null
  const bestSeller = active.toSorted((a, b) => b.unitsSold30d - a.unitsSold30d)[0]
  const hasBestSeller = bestSeller !== undefined && bestSeller.unitsSold30d > 0

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {seesCosts ? (
          <KpiCard
            label="Invertido en inventario"
            value={<AnimatedNumber value={valuation.costValue} kind="money" />}
            icon={Coins}
            hint="Al costo promedio"
          />
        ) : (
          <KpiCard label="Unidades en stock" value={<AnimatedNumber value={valuation.units} kind="number" />} icon={Boxes} />
        )}
        <KpiCard
          label="Valor a precio de venta"
          value={<AnimatedNumber value={valuation.retailValue} kind="money" />}
          icon={Boxes}
          accent="neutral"
        />
        {seesCosts ? (
          <KpiCard
            label="Ganancia en tus estantes"
            value={<AnimatedNumber value={valuation.potentialProfit} kind="money" />}
            icon={Gem}
            accent="gold"
            hint="Si vendes todo lo que tienes"
          />
        ) : null}
        <KpiCard
          label="Por reabastecer"
          value={<AnimatedNumber value={toRestock} kind="number" />}
          icon={TriangleAlert}
          accent={toRestock > 0 ? "gold" : "neutral"}
          hint={toRestock > 0 ? "Agotados o en el mínimo" : "Todo en orden"}
        />
        <KpiCard
          label="Productos activos"
          value={<AnimatedNumber value={active.length} kind="number" />}
          icon={Package}
          accent="neutral"
          hint={`${format.number(products.length)} en total`}
        />
        {averageMargin !== null ? (
          <KpiCard label="Margen promedio" value={format.percent(averageMargin)} icon={Percent} accent="gold" hint="De cada venta" />
        ) : null}
        <KpiCard
          label="Más vendido · 30 días"
          value={hasBestSeller ? bestSeller.name : "—"}
          icon={Flame}
          hint={hasBestSeller ? `${format.number(bestSeller.unitsSold30d)} unidades` : "Aún sin ventas"}
        />
      </div>

      <LowStockCard products={products} href={routes.org.inventory(organization.slug)} />
    </>
  )
}
