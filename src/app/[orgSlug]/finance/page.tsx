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
import { getExpenses } from "@/modules/finance/application/queries"
import { ExpensesCard } from "@/modules/finance/components/expenses-card"

export const metadata: Metadata = { title: "Gastos" }

type FinancePageProps = PageProps<"/[orgSlug]/finance">

export default function FinancePage({ params, searchParams }: FinancePageProps) {
  return (
    <Suspense fallback={<PageSkeleton cards={2} />}>
      <Finance params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Finance({ params, searchParams }: Pick<FinancePageProps, "params" | "searchParams">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)

  if (!can(context, "finance.read")) {
    return (
      <PageContainer>
        <PageHeader title="Gastos" />
        <Card>
          <NoAccess />
        </Card>
      </PageContainer>
    )
  }

  const query = await searchParams
  const now = new Date()
  const period = resolvePeriod(parsePeriod(query.period), now)
  const expenses = await getExpenses(context, period)

  return (
    <PageContainer>
      <PageHeader
        title="Gastos"
        description={`${period.label}. Arriendo, servicios, publicidad y todo lo que pagas para operar.`}
        actions={<PeriodPicker basePath={routes.org.finance(orgSlug)} current={period.key} />}
      />
      <ExpensesCard expenses={expenses} today={localDateKey(now, context.organization.timezone)} />
    </PageContainer>
  )
}
