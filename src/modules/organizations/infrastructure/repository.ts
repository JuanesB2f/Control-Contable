import "server-only"

import type { SupabaseServerClient } from "@/lib/supabase/server"
import type { AppRole } from "@/modules/access/domain/permissions"

import type { Organization, OrganizationSummary } from "../domain/types"

const ORGANIZATION_COLUMNS = "id, name, slug, business_type, country, currency, timezone, locale, created_at"

export async function findMembershipBySlug(
  supabase: SupabaseServerClient,
  slug: string,
  userId: string,
): Promise<{ organization: Organization; role: AppRole } | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select(`${ORGANIZATION_COLUMNS}, organization_members!inner(role, status)`)
    .eq("slug", slug)
    .eq("organization_members.user_id", userId)
    .eq("organization_members.status", "active")
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { organization_members: memberships, ...organization } = data
  const membership = memberships[0]
  return membership ? { organization, role: membership.role } : null
}

export async function listUserOrganizations(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<OrganizationSummary[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, created_at, organization:organizations!inner(id, name, slug)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })

  if (error) throw error
  return data.map(({ role, organization }) => ({ ...organization, role }))
}

export async function getRolePermissions(supabase: SupabaseServerClient, role: AppRole) {
  const { data, error } = await supabase.from("role_permissions").select("permission").eq("role", role)
  if (error) throw error
  return data.map((row) => row.permission)
}
