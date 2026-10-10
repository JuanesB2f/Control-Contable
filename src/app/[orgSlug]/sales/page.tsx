import type { Metadata } from "next"
import { Suspense } from "react"

import { NoAccess } from "@/components/feedback/no-access"
import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { Card } from "@/components/ui/card"
import { routes } from "@/config/routes"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { PeriodPicker } from "@/modules/analytics/components/period-picker"
import { localDateKey, parsePeriod, resolvePeriod } from "@/modules/analytics/domain/period"
import { getCustomers } from "@/modules/customers/application/queries"
import { getProducts } from "@/modules/products/application/queries"
import { getReceivables, getSales } from "@/modules/sales/application/queries"
import { SalesView } from "@/modules/sales/components/sales-view"

export const metadata: Metadata = { title: "Ventas" }

type SalesPageProps = PageProps<"/[orgSlug]/sales">

export default function SalesPage({ params, searchParams }: SalesPageProps) {
  return (
    <Suspense fallback={<PageSkeleton cards={2} />}>
      <Sales params={params} searchParams={searchParams} />
    </Suspense>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

async function Sales({ params, searchParams }: Pick<SalesPageProps, "params" | "searchParams">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)

  if (!can(context, "sales.read")) {
    return (
      <PageContainer>
        <PageHeader title="Ventas" />
        <Card>
          <NoAccess />
        </Card>
      </PageContainer>
    )
  }

  const query = await searchParams
  const now = new Date()
  const period = resolvePeriod(parsePeriod(query.period), now)
  const { organization } = context

  const [sales, receivables, products, customers] = await Promise.all([
    getSales(context, period),
    getReceivables(context),
    can(context, "products.read") ? getProducts(context) : Promise.resolve([]),
    can(context, "customers.read") ? getCustomers(context) : Promise.resolve(null),
  ])

  return (
    <PageContainer>
      <PageHeader
        title="Ventas"
        description={`${period.label}. Registra ventas, cobra abonos y revisa tu historial.`}
        actions={<PeriodPicker basePath={routes.org.sales(orgSlug)} current={period.key} />}
      />

      <SalesView
        sales={sales}
        receivables={receivables}
        products={products}
        customers={customers?.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone })) ?? null}
        openNew={query.new === "1"}
        focusSaleId={typeof query.sale === "string" ? query.sale : null}
        todayKey={localDateKey(now, organization.timezone)}
        yesterdayKey={localDateKey(new Date(now.getTime() - DAY_MS), organization.timezone)}
      />
    </PageContainer>
  )
}
