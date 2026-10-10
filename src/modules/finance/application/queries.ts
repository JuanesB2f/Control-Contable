import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { OrgContext } from "@/modules/access/application/org-context"
import { localDateKey, type ResolvedPeriod } from "@/modules/analytics/domain/period"

import { getFinanceSummary, listExpenses } from "../infrastructure/repository"

export async function getFinanceOverview(context: OrgContext, period: ResolvedPeriod) {
  const supabase = await createSupabaseServerClient()
  const { id: organizationId, timezone } = context.organization
  const [summary, expenses] = await Promise.all([
    getFinanceSummary(supabase, organizationId, period),
    listExpenses(supabase, organizationId, {
      fromDate: localDateKey(period.from, timezone),
      toDate: localDateKey(period.to, timezone),
    }),
  ])
  return { summary, expenses }
}
