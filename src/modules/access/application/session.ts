import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { routes } from "@/config/routes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type CurrentUser = {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

/** Verified user for the current request (JWT validated by Supabase), memoized per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims?.sub) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, avatar_url")
    .eq("id", claims.sub)
    .maybeSingle()

  return {
    id: claims.sub,
    email: profile?.email ?? claims.email ?? "",
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }
})

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect(routes.login)
  return user
}
