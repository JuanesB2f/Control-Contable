import { Flame, Package, Percent, TriangleAlert } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { KpiCard } from "@/components/data/kpi-card"
import { NoAccess } from "@/components/feedback/no-access"
import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { Card } from "@/components/ui/card"
import { createMoneyFormatter } from "@/lib/money"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { stockStatus } from "@/modules/inventory/domain/stock"
import { getProducts } from "@/modules/products/application/queries"
import { ProductsView } from "@/modules/products/components/products-view"
import { marginRatio } from "@/modules/products/domain/pricing"

export const metadata: Metadata = { title: "Productos" }

type ProductsPageProps = PageProps<"/[orgSlug]/products">

export default function ProductsPage({ params, searchParams }: ProductsPageProps) {
  return (
    <Suspense fallback={<PageSkeleton cards={4} />}>
      <Products params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Products({ params, searchParams }: Pick<ProductsPageProps, "params" | "searchParams">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)
  const header = <PageHeader title="Productos" description="Tu catálogo con lo que te cuesta, lo que cobras y lo que ganas." />

  if (!can(context, "products.read")) {
    return (
      <PageContainer>
        {header}
        <Card>
          <NoAccess />
        </Card>
      </PageContainer>
    )
  }

  const [products, query] = await Promise.all([getProducts(context), searchParams])
  const format = createMoneyFormatter(context.organization)
  const active = products.filter((product) => product.isActive)
  const withCost = active.filter((product) => product.costPrice !== null && product.salePrice > 0)
  const averageMargin = withCost.length
    ? withCost.reduce((sum, product) => sum + marginRatio(product.costPrice ?? 0, product.salePrice), 0) / withCost.length
    : null
  const bestSeller = [...active].sort((a, b) => b.unitsSold30d - a.unitsSold30d)[0]
  const toRestock = active.filter((product) => stockStatus(product.stock, product.minStock) !== "ok").length

  return (
    <PageContainer>
      {header}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <KpiCard label="Productos activos" value={format.number(active.length)} icon={Package} hint={`${products.length} en total`} />
          {averageMargin !== null ? (
            <KpiCard label="Margen promedio" value={format.percent(averageMargin)} icon={Percent} accent="gold" hint="De cada venta" />
          ) : null}
          <KpiCard
            label="Más vendido · 30 días"
            value={bestSeller && bestSeller.unitsSold30d > 0 ? bestSeller.name : "—"}
            icon={Flame}
            hint={bestSeller && bestSeller.unitsSold30d > 0 ? `${format.number(bestSeller.unitsSold30d)} unidades` : "Aún sin ventas"}
          />
          <KpiCard
            label="Por reabastecer"
            value={format.number(toRestock)}
            icon={TriangleAlert}
            accent={toRestock > 0 ? "gold" : "neutral"}
            hint={toRestock > 0 ? "Agotados o en el mínimo" : "Todo en orden"}
          />
        </div>
      ) : null}
      <ProductsView products={products} openNew={query.new === "1"} />
    </PageContainer>
  )
}
