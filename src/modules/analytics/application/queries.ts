import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { OrgContext } from "@/modules/access/application/org-context"

import type { ResolvedPeriod } from "../domain/period"
import { getSalesAnalytics } from "../infrastructure/repository"

export async function getAnalytics(context: OrgContext, period: ResolvedPeriod) {
  return getSalesAnalytics(await createSupabaseServerClient(), context.organization.id, period)
}
