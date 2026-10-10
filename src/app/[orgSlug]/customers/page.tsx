import type { Metadata } from "next"
import { Suspense } from "react"

import { NoAccess } from "@/components/feedback/no-access"
import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { Card } from "@/components/ui/card"
import { formatDate, formatRelativeTime } from "@/lib/dates"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { getCustomers } from "@/modules/customers/application/queries"
import { CustomersView, type CustomerRow } from "@/modules/customers/components/customers-view"
import { championThreshold, segmentCustomer } from "@/modules/customers/domain/segments"

export const metadata: Metadata = { title: "Clientes" }

type CustomersPageProps = PageProps<"/[orgSlug]/customers">

export default function CustomersPage({ params, searchParams }: CustomersPageProps) {
  return (
    <Suspense fallback={<PageSkeleton cards={2} />}>
      <Customers params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Customers({ params, searchParams }: Pick<CustomersPageProps, "params" | "searchParams">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)
  const header = <PageHeader title="Clientes" description="Tus clientes, sus datos y lo que te han comprado." />

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
  const now = new Date()
  const threshold = championThreshold(customers.map((customer) => customer.totalSpent))
  const rows: CustomerRow[] = customers.map((customer) => ({
    ...customer,
    segment: segmentCustomer(customer, now, threshold),
    lastPurchaseLabel: customer.lastPurchaseAt ? formatRelativeTime(customer.lastPurchaseAt, now, organization.locale) : null,
    sinceLabel: formatDate(customer.createdAt, organization.timezone, organization.locale),
  }))

  return (
    <PageContainer>
      {header}
      <CustomersView customers={rows} openNew={query.new === "1"} />
    </PageContainer>
  )
}
