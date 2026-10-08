import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

import { invitationTokenSchema } from "../domain/schemas"
import { getInvitationPreview, listMembers, listPendingInvitations } from "../infrastructure/repository"
import { can, type OrgContext } from "./org-context"

export async function getInvitation(token: string) {
  const parsed = invitationTokenSchema.safeParse(token)
  if (!parsed.success) return null
  return getInvitationPreview(await createSupabaseServerClient(), parsed.data)
}

export async function getTeam(context: OrgContext) {
  const supabase = await createSupabaseServerClient()
  const canManage = can(context, "members.manage")

  const [members, invitations] = await Promise.all([
    listMembers(supabase, context.organization.id),
    canManage ? listPendingInvitations(supabase, context.organization.id) : Promise.resolve([]),
  ])

  return { members, invitations, canManage }
}
