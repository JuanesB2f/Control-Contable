import type { Metadata } from "next"
import { Suspense } from "react"

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
import { getProducts } from "@/modules/products/application/queries"

export const metadata: Metadata = { title: "Inventario" }

export default function InventoryPage({ params }: PageProps<"/[orgSlug]/inventory">) {
  return (
    <Suspense fallback={<PageSkeleton cards={2} />}>
      <Inventory params={params} />
    </Suspense>
  )
}

async function Inventory({ params }: Pick<PageProps<"/[orgSlug]/inventory">, "params">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)
  const description = "Registra compras, ajusta conteos y revisa cada movimiento."

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

  return (
    <PageContainer>
      <PageHeader title="Inventario" description={description} actions={<AddStockButton products={products} />} />
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
