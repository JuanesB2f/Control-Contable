import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { OrgContext } from "@/modules/access/application/org-context"

import { listStockMovements } from "../infrastructure/repository"

export async function getStockMovements(context: OrgContext) {
  return listStockMovements(await createSupabaseServerClient(), context.organization.id)
}
