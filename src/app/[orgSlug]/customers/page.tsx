import { HeartHandshake, Repeat, UserRoundX, Users } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { KpiCard } from "@/components/data/kpi-card"
import { NoAccess } from "@/components/feedback/no-access"
import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { Card } from "@/components/ui/card"
import { formatDate, formatRelativeTime } from "@/lib/dates"
import { createMoneyFormatter } from "@/lib/money"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { getCustomers } from "@/modules/customers/application/queries"
import { CustomersView, type CustomerRow } from "@/modules/customers/components/customers-view"
import { championThreshold, segmentCustomer } from "@/modules/customers/domain/segments"

export const metadata: Metadata = { title: "Clientes" }

type CustomersPageProps = PageProps<"/[orgSlug]/customers">

export default function CustomersPage({ params, searchParams }: CustomersPageProps) {
  return (
    <Suspense fallback={<PageSkeleton cards={4} />}>
      <Customers params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Customers({ params, searchParams }: Pick<CustomersPageProps, "params" | "searchParams">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)
  const header = <PageHeader title="Clientes" description="Quién te compra, cuánto y cada cuánto." />

  if (!can(context, "customers.read")) {
    return (
      <PageContainer>
        {header}
        <Card>
          <NoAccess />
        </Card>
      </PageContainer>
    )
  }

  const [customers, query] = await Promise.all([getCustomers(context), searchParams])
  const { organization } = context
  const format = createMoneyFormatter(organization)
  const now = new Date()
  const threshold = championThreshold(customers.map((customer) => customer.totalSpent))
  const rows: CustomerRow[] = customers.map((customer) => ({
    ...customer,
    segment: segmentCustomer(customer, now, threshold),
    lastPurchaseLabel: customer.lastPurchaseAt ? formatRelativeTime(customer.lastPurchaseAt, now, organization.locale) : null,
    sinceLabel: formatDate(customer.createdAt, organization.timezone, organization.locale),
  }))

  const buyers = customers.filter((customer) => customer.orders > 0)
  const repeatRate = buyers.length ? buyers.filter((customer) => customer.orders > 1).length / buyers.length : null
  const averageValue = buyers.length ? buyers.reduce((sum, customer) => sum + customer.totalSpent, 0) / buyers.length : 0
  const atRisk = rows.filter((row) => row.segment === "at_risk").length

  return (
    <PageContainer>
      {header}
      {customers.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <KpiCard label="Clientes" value={format.number(customers.length)} icon={Users} hint={`${format.number(buyers.length)} ya compraron`} />
          <KpiCard
            label="Vuelven a comprar"
            value={repeatRate === null ? "—" : format.percent(repeatRate)}
            icon={Repeat}
            accent="gold"
            hint="Compraron más de una vez"
          />
          <KpiCard label="Valor por cliente" value={format.money(averageValue)} icon={HeartHandshake} accent="neutral" hint="Lo que te deja cada comprador" />
          <KpiCard
            label="Por recuperar"
            value={format.number(atRisk)}
            icon={UserRoundX}
            accent={atRisk > 0 ? "gold" : "neutral"}
            hint={atRisk > 0 ? "Más de 60 días sin comprar" : "Nadie se te está yendo"}
          />
        </div>
      ) : null}
      <CustomersView customers={rows} openNew={query.new === "1"} />
    </PageContainer>
  )
}
