import { Boxes, Coins, Gem, TriangleAlert } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { KpiCard } from "@/components/data/kpi-card"
import { NoAccess } from "@/components/feedback/no-access"
import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createMoneyFormatter } from "@/lib/money"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { getStockMovements } from "@/modules/inventory/application/queries"
import { AddStockButton } from "@/modules/inventory/components/add-stock-button"
import { InventoryView } from "@/modules/inventory/components/inventory-view"
import { MovementsList } from "@/modules/inventory/components/movements-list"
import { inventoryValuation, stockStatus } from "@/modules/inventory/domain/stock"
import { getProducts } from "@/modules/products/application/queries"

export const metadata: Metadata = { title: "Inventario" }

export default function InventoryPage({ params }: PageProps<"/[orgSlug]/inventory">) {
  return (
    <Suspense fallback={<PageSkeleton cards={4} />}>
      <Inventory params={params} />
    </Suspense>
  )
}

async function Inventory({ params }: Pick<PageProps<"/[orgSlug]/inventory">, "params">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)
  const description = "Cuánto tienes, cuánto te dura y cuánto dinero hay en tus estantes."

  if (!can(context, "inventory.read")) {
    return (
      <PageContainer>
        <PageHeader title="Inventario" description={description} />
        <Card>
          <NoAccess />
        </Card>
      </PageContainer>
    )
  }

  const [products, movements] = await Promise.all([getProducts(context), getStockMovements(context)])
  const { organization } = context
  const format = createMoneyFormatter(organization)
  const seesCosts = can(context, "costs.read")
  const valuation = inventoryValuation(products)
  const toRestock = products.filter((product) => product.isActive && stockStatus(product.stock, product.minStock) !== "ok").length

  return (
    <PageContainer>
      <PageHeader title="Inventario" description={description} actions={<AddStockButton products={products} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {seesCosts ? (
          <KpiCard label="Invertido en inventario" value={format.money(valuation.costValue)} icon={Coins} hint="Al costo promedio" />
        ) : (
          <KpiCard label="Unidades en stock" value={format.number(valuation.units)} icon={Boxes} />
        )}
        <KpiCard label="Valor a precio de venta" value={format.money(valuation.retailValue)} icon={Boxes} accent="neutral" />
        {seesCosts ? (
          <KpiCard
            label="Ganancia en tus estantes"
            value={format.money(valuation.potentialProfit)}
            icon={Gem}
            accent="gold"
            hint="Si vendes todo lo que tienes"
          />
        ) : null}
        <KpiCard
          label="Por reabastecer"
          value={format.number(toRestock)}
          icon={TriangleAlert}
          accent={toRestock > 0 ? "gold" : "neutral"}
          hint={toRestock > 0 ? "Agotados o en el mínimo" : "Todo en orden"}
        />
      </div>

      <Tabs defaultValue="stock" className="gap-4">
        <TabsList>
          <TabsTrigger value="stock">Existencias</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
          <InventoryView products={products} />
        </TabsContent>
        <TabsContent value="movements">
          <Card className="gap-0 py-0">
            <MovementsList movements={movements} timezone={organization.timezone} locale={organization.locale} format={format} />
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
