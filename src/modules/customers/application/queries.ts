import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { OrgContext } from "@/modules/access/application/org-context"

import { listCustomers } from "../infrastructure/repository"

export async function getCustomers(context: OrgContext) {
  return listCustomers(await createSupabaseServerClient(), context.organization.id)
}
