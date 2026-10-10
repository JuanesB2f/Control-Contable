import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { OrgContext } from "@/modules/access/application/org-context"
import { localDateKey, type ResolvedPeriod } from "@/modules/analytics/domain/period"

import { getFinanceSummary, listExpenses } from "../infrastructure/repository"

export async function getFinanceReport(context: OrgContext, period: ResolvedPeriod) {
  const supabase = await createSupabaseServerClient()
  return getFinanceSummary(supabase, context.organization.id, period)
}

export async function getExpenses(context: OrgContext, period: ResolvedPeriod) {
  const supabase = await createSupabaseServerClient()
  const { id: organizationId, timezone } = context.organization
  return listExpenses(supabase, organizationId, {
    fromDate: localDateKey(period.from, timezone),
    toDate: localDateKey(period.to, timezone),
  })
}
