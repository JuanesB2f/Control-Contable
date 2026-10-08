import "server-only"

import type { SupabaseServerClient } from "@/lib/supabase/server"

import type { AppRole } from "../domain/permissions"

export type TeamMember = {
  userId: string
  role: AppRole
  joinedAt: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
}

export type PendingInvitation = {
  id: string
  email: string
  role: AppRole
  createdAt: string
  expiresAt: string
  invitedBy: string | null
}

export type InvitationPreview = {
  organizationName: string
  email: string
  role: AppRole
  inviterName: string | null
  status: "pending" | "accepted" | "expired" | "revoked"
}

export async function listMembers(supabase: SupabaseServerClient, organizationId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "user_id, role, created_at, profile:profiles!organization_members_user_id_fkey(email, full_name, avatar_url)",
    )
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at", { ascending: true })

  if (error) throw error
  return data.map((row) => ({
    userId: row.user_id,
    role: row.role,
    joinedAt: row.created_at,
    email: row.profile?.email ?? null,
    fullName: row.profile?.full_name ?? null,
    avatarUrl: row.profile?.avatar_url ?? null,
  }))
}

export async function listPendingInvitations(
  supabase: SupabaseServerClient,
  organizationId: string,
): Promise<PendingInvitation[]> {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      "id, email, role, created_at, expires_at, inviter:profiles!organization_invitations_invited_by_fkey(full_name, email)",
    )
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    invitedBy: row.inviter?.full_name ?? row.inviter?.email ?? null,
  }))
}

const INVITATION_STATUSES = ["pending", "accepted", "expired", "revoked"] as const

export async function getInvitationPreview(
  supabase: SupabaseServerClient,
  token: string,
): Promise<InvitationPreview | null> {
  const { data, error } = await supabase.rpc("get_invitation", { p_token: token }).maybeSingle()
  if (error) throw error
  if (!data) return null

  const status = INVITATION_STATUSES.find((value) => value === data.status) ?? "revoked"
  return {
    organizationName: data.organization_name,
    email: data.email,
    role: data.role,
    inviterName: data.inviter_name,
    status,
  }
}
