import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { OrgContext } from "@/modules/access/application/org-context"

import { listProducts } from "../infrastructure/repository"

export async function getProducts(context: OrgContext) {
  return listProducts(await createSupabaseServerClient(), context.organization.id)
}
