import { Coins, Gem, Receipt, ShoppingBasket } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { KpiCard, trendFromChange } from "@/components/data/kpi-card"
import { NoAccess } from "@/components/feedback/no-access"
import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { Card } from "@/components/ui/card"
import { routes } from "@/config/routes"
import { createMoneyFormatter } from "@/lib/money"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { getAnalytics } from "@/modules/analytics/application/queries"
import { PeriodPicker } from "@/modules/analytics/components/period-picker"
import { changeRatio, localDateKey, parsePeriod, resolvePeriod } from "@/modules/analytics/domain/period"
import { getCustomers } from "@/modules/customers/application/queries"
import { getProducts } from "@/modules/products/application/queries"
import { getReceivables, getSales } from "@/modules/sales/application/queries"
import { SalesView } from "@/modules/sales/components/sales-view"

export const metadata: Metadata = { title: "Ventas" }

type SalesPageProps = PageProps<"/[orgSlug]/sales">

export default function SalesPage({ params, searchParams }: SalesPageProps) {
  return (
    <Suspense fallback={<PageSkeleton cards={4} />}>
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

  const [sales, receivables, analytics, products, customers] = await Promise.all([
    getSales(context, period),
    getReceivables(context),
    getAnalytics(context, period),
    can(context, "products.read") ? getProducts(context) : Promise.resolve([]),
    can(context, "customers.read") ? getCustomers(context) : Promise.resolve(null),
  ])

  const format = createMoneyFormatter(organization)
  const { summary, previous } = analytics
  const averageTicket = summary.salesCount > 0 ? summary.revenue / summary.salesCount : 0
  const previousTicket = previous.salesCount > 0 ? previous.revenue / previous.salesCount : 0
  const percent = (ratio: number) => format.percent(ratio)

  return (
    <PageContainer>
      <PageHeader
        title="Ventas"
        description={`${period.label}. Cada venta descuenta el inventario y calcula tu ganancia.`}
        actions={<PeriodPicker basePath={routes.org.sales(orgSlug)} current={period.key} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          label="Vendido"
          value={format.money(summary.revenue)}
          icon={Coins}
          trend={trendFromChange(changeRatio(summary.revenue, previous.revenue), percent)}
          hint="vs. periodo anterior"
        />
        {summary.profit !== null ? (
          <KpiCard
            label="Ganancia"
            value={format.money(summary.profit)}
            icon={Gem}
            accent="gold"
            trend={previous.profit !== null ? trendFromChange(changeRatio(summary.profit, previous.profit), percent) : undefined}
            hint={summary.revenue > 0 ? `Margen ${format.percent(summary.profit / summary.revenue)}` : undefined}
          />
        ) : (
          <KpiCard label="Unidades" value={format.number(summary.units)} icon={ShoppingBasket} accent="gold" />
        )}
        <KpiCard
          label="Ventas"
          value={format.number(summary.salesCount)}
          icon={Receipt}
          accent="neutral"
          trend={trendFromChange(changeRatio(summary.salesCount, previous.salesCount), percent)}
        />
        <KpiCard
          label="Ticket promedio"
          value={format.money(averageTicket)}
          icon={ShoppingBasket}
          accent="neutral"
          trend={trendFromChange(changeRatio(averageTicket, previousTicket), percent)}
        />
      </div>

      <SalesView
        sales={sales}
        receivables={receivables}
        products={products}
        customers={customers?.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone })) ?? null}
        openNew={query.new === "1"}
        todayKey={localDateKey(now, organization.timezone)}
        yesterdayKey={localDateKey(new Date(now.getTime() - DAY_MS), organization.timezone)}
      />
    </PageContainer>
  )
}
