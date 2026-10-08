import { z } from "zod"

import { emailSchema } from "@/modules/auth/domain/schemas"

import { ASSIGNABLE_ROLES } from "./permissions"

const roleSchema = z.enum(ASSIGNABLE_ROLES, "Selecciona un rol.")

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: roleSchema,
})
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const updateMemberRoleSchema = z.object({
  userId: z.uuid(),
  role: roleSchema,
})
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>

export const memberIdSchema = z.uuid()
export const invitationIdSchema = z.uuid()
export const invitationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/)
