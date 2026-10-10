import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { OrgContext } from "@/modules/access/application/org-context"

import { listSales } from "../infrastructure/repository"

export async function getSales(context: OrgContext, range: { from: Date; to: Date }) {
  return listSales(await createSupabaseServerClient(), context.organization.id, { range })
}

/** Every completed sale that still has a balance, no matter when it was made. */
export async function getReceivables(context: OrgContext) {
  return listSales(await createSupabaseServerClient(), context.organization.id, { pendingOnly: true })
}
