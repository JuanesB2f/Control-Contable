import "server-only"

import { cache } from "react"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { requireUser } from "@/modules/access/application/session"

import { listUserOrganizations } from "../infrastructure/repository"

/** Organizations where the signed-in user is an active member, oldest first. */
export const getMyOrganizations = cache(async () => {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  return listUserOrganizations(supabase, user.id)
})
