import { Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { Button } from "@/components/ui/button"
import { routes } from "@/config/routes"
import { greetingFor } from "@/lib/dates"
import { can, requireOrgContext, type OrgContext } from "@/modules/access/application/org-context"
import { PeriodPicker } from "@/modules/analytics/components/period-picker"
import { parsePeriod, resolvePeriod, type ResolvedPeriod } from "@/modules/analytics/domain/period"
import { BoardSkeleton } from "@/modules/dashboard/components/board-skeleton"
import { CustomersBoard } from "@/modules/dashboard/components/customers-board"
import { DashboardTabs } from "@/modules/dashboard/components/dashboard-tabs"
import { FinanceBoard } from "@/modules/dashboard/components/finance-board"
import { InventoryBoard } from "@/modules/dashboard/components/inventory-board"
import { OverviewBoard } from "@/modules/dashboard/components/overview-board"
import { SalesBoard } from "@/modules/dashboard/components/sales-board"
import {
  DASHBOARD_VIEWS,
  DASHBOARD_VIEW_INFO,
  dashboardParams,
  resolveDashboardView,
  type DashboardView,
} from "@/modules/dashboard/domain/views"

export const metadata: Metadata = { title: "Dashboard" }

type DashboardPageProps = PageProps<"/[orgSlug]/dashboard">

export default function DashboardPage({ params, searchParams }: DashboardPageProps) {
  return (
    <Suspense fallback={<PageSkeleton cards={3} />}>
      <Dashboard params={params} searchParams={searchParams} />
    </Suspense>
  )
}

const DESCRIPTIONS: Record<DashboardView, (period: ResolvedPeriod) => string> = {
  overview: (period) => `${period.label}: cómo va tu negocio de un vistazo.`,
  sales: (period) => `${period.label}: cuánto vendes, cómo te pagan y qué se vende más.`,
  finance: (period) => `${period.label}: lo que vendiste, lo que te costó y lo que de verdad te queda.`,
  inventory: () => "Hoy: el dinero en tus estantes y lo que debes reabastecer.",
  customers: () => "Quién te compra, cuánto vale cada cliente y quién se está alejando.",
}

function Board({ view, context, period }: { view: DashboardView; context: OrgContext; period: ResolvedPeriod }) {
  switch (view) {
    case "overview":
      return <OverviewBoard context={context} period={period} />
    case "sales":
      return <SalesBoard context={context} period={period} />
    case "finance":
      return <FinanceBoard context={context} period={period} />
    case "inventory":
      return <InventoryBoard context={context} />
    case "customers":
      return <CustomersBoard context={context} />
  }
}

async function Dashboard({ params, searchParams }: Pick<DashboardPageProps, "params" | "searchParams">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)
  const query = await searchParams
  const now = new Date()
  const period = resolvePeriod(parsePeriod(query.period), now)
  const { organization } = context
  const views = DASHBOARD_VIEWS.filter((view) => can(context, DASHBOARD_VIEW_INFO[view].permission))
  const view = resolveDashboardView(query.view, views)
  const basePath = routes.org.dashboard(orgSlug)
  const firstName = context.user.fullName?.split(" ")[0]

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader
        title={`${greetingFor(now, organization.timezone)}${firstName ? `, ${firstName}` : ""} 👋`}
        description={DESCRIPTIONS[view](period)}
        actions={
          <>
            {DASHBOARD_VIEW_INFO[view].usesPeriod ? (
              <PeriodPicker basePath={basePath} current={period.key} params={dashboardParams(view)} />
            ) : null}
            {can(context, "sales.create") ? (
              <Button asChild className="max-sm:hidden">
                <Link href={`${routes.org.sales(orgSlug)}?new=1`}>
                  <Plus data-icon="inline-start" />
                  Nueva venta
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {views.length > 1 ? <DashboardTabs basePath={basePath} views={views} current={view} period={period.key} /> : null}

      <Suspense key={`${view}:${period.key}`} fallback={<BoardSkeleton />}>
        <Board view={view} context={context} period={period} />
      </Suspense>
    </PageContainer>
  )
}
