import type { Metadata } from "next"
import { Suspense } from "react"

import { NoAccess } from "@/components/feedback/no-access"
import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { Card } from "@/components/ui/card"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { getProducts } from "@/modules/products/application/queries"
import { ProductsView } from "@/modules/products/components/products-view"

export const metadata: Metadata = { title: "Productos" }

type ProductsPageProps = PageProps<"/[orgSlug]/products">

export default function ProductsPage({ params, searchParams }: ProductsPageProps) {
  return (
    <Suspense fallback={<PageSkeleton cards={2} />}>
      <Products params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Products({ params, searchParams }: Pick<ProductsPageProps, "params" | "searchParams">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)
  const header = <PageHeader title="Productos" description="Tu catálogo: foto, precio, costo y margen. Las unidades las manejas en Inventario." />

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
  return (
    <PageContainer>
      {header}
      <ProductsView products={products} openNew={query.new === "1"} />
    </PageContainer>
  )
}
