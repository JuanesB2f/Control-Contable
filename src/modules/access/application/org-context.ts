import "server-only"

import { notFound } from "next/navigation"
import { cache } from "react"

import { fail, type ActionError } from "@/lib/action-result"
import { createSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server"
import type { Organization } from "@/modules/organizations/domain/types"
import { findMembershipBySlug, getRolePermissions } from "@/modules/organizations/infrastructure/repository"

import { isPermission, type AppRole, type Permission } from "../domain/permissions"
import { getCurrentUser, requireUser, type CurrentUser } from "./session"

export type OrgContext = {
  user: CurrentUser
  organization: Organization
  role: AppRole
  permissions: Permission[]
}

/** Resolves the organization for `slug` only if the current user is an active member. */
export const getOrgContext = cache(async (slug: string): Promise<OrgContext | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createSupabaseServerClient()
  const membership = await findMembershipBySlug(supabase, slug, user.id)
  if (!membership) return null

  const permissions = (await getRolePermissions(supabase, membership.role)).filter(isPermission)
  return { user, organization: membership.organization, role: membership.role, permissions }
})

/** For pages: redirects to login without a session and 404s for non-members (never reveals the org exists). */
export async function requireOrgContext(slug: string): Promise<OrgContext> {
  await requireUser()
  const context = await getOrgContext(slug)
  if (!context) notFound()
  return context
}

export function can(context: Pick<OrgContext, "permissions">, permission: Permission) {
  return context.permissions.includes(permission)
}

type AuthorizedAction =
  | { ok: true; context: OrgContext; supabase: SupabaseServerClient }
  | { ok: false; error: ActionError }

/** For Server Actions: re-validates membership and permission on every call. */
export async function authorizeOrgAction(slug: string, permission: Permission): Promise<AuthorizedAction> {
  const user = await getCurrentUser()
  if (!user) return fail("unauthenticated", "Tu sesión expiró. Vuelve a iniciar sesión.")

  const context = await getOrgContext(slug)
  if (!context) return fail("not_found", "No encontramos este negocio.")
  if (!can(context, permission)) return fail("forbidden", "No tienes permiso para realizar esta acción.")

  return { ok: true, context, supabase: await createSupabaseServerClient() }
}
