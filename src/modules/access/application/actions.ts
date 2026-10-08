"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { routes } from "@/config/routes"
import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result"
import { sendEmail } from "@/lib/email/send-email"
import { getPublicEnv } from "@/lib/env"
import { mapDatabaseError } from "@/lib/supabase/errors"
import { createSupabaseServerClient } from "@/lib/supabase/server"

import {
  invitationIdSchema,
  invitationTokenSchema,
  inviteMemberSchema,
  memberIdSchema,
  updateMemberRoleSchema,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
} from "../domain/schemas"
import { buildInvitationEmail } from "../infrastructure/invitation-email"
import { authorizeOrgAction } from "./org-context"
import { getCurrentUser } from "./session"

function revalidateMembers(orgSlug: string) {
  revalidatePath(routes.org.members(orgSlug))
}

export async function inviteMember(
  orgSlug: string,
  input: InviteMemberInput,
): Promise<ActionResult<{ inviteUrl: string; emailSent: boolean }>> {
  const auth = await authorizeOrgAction(orgSlug, "members.manage")
  if (!auth.ok) return auth

  const parsed = inviteMemberSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { context, supabase } = auth
  const { data, error } = await supabase
    .rpc("create_invitation", {
      p_organization_id: context.organization.id,
      p_email: parsed.data.email,
      p_role: parsed.data.role,
    })
    .single()

  if (error) return mapDatabaseError(error)

  const inviteUrl = `${getPublicEnv().NEXT_PUBLIC_SITE_URL}${routes.invite(data.token)}`
  const email = buildInvitationEmail({
    organizationName: context.organization.name,
    inviterName: context.user.fullName ?? context.user.email,
    role: parsed.data.role,
    inviteUrl,
  })
  const emailSent = await sendEmail({ to: parsed.data.email, ...email })

  revalidateMembers(orgSlug)
  return ok({ inviteUrl, emailSent })
}

export async function revokeInvitation(orgSlug: string, invitationId: string): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "members.manage")
  if (!auth.ok) return auth

  const parsed = invitationIdSchema.safeParse(invitationId)
  if (!parsed.success) return fail("validation", "Invitación inválida.")

  const { error } = await auth.supabase.rpc("revoke_invitation", { p_invitation_id: parsed.data })
  if (error) return mapDatabaseError(error)

  revalidateMembers(orgSlug)
  return ok()
}

export async function updateMemberRole(orgSlug: string, input: UpdateMemberRoleInput): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "members.manage")
  if (!auth.ok) return auth

  const parsed = updateMemberRoleSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { error } = await auth.supabase.rpc("update_member_role", {
    p_organization_id: auth.context.organization.id,
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  })
  if (error) return mapDatabaseError(error)

  revalidateMembers(orgSlug)
  return ok()
}

export async function removeMember(orgSlug: string, userId: string): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "members.manage")
  if (!auth.ok) return auth

  const parsed = memberIdSchema.safeParse(userId)
  if (!parsed.success) return fail("validation", "Miembro inválido.")

  const { error } = await auth.supabase.rpc("remove_member", {
    p_organization_id: auth.context.organization.id,
    p_user_id: parsed.data,
  })
  if (error) return mapDatabaseError(error)

  revalidateMembers(orgSlug)
  return ok()
}

export async function acceptInvitation(token: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("unauthenticated", "Inicia sesión para aceptar la invitación.")

  const parsed = invitationTokenSchema.safeParse(token)
  if (!parsed.success) return fail("not_found", "Esta invitación no es válida.")

  const supabase = await createSupabaseServerClient()
  const { data: slug, error } = await supabase.rpc("accept_invitation", { p_token: parsed.data })
  if (error) return mapDatabaseError(error)

  redirect(routes.org.dashboard(slug))
}
