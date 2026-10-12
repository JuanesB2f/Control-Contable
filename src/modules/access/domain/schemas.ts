import { z } from "zod"

import { emailSchema, passwordSchema } from "@/modules/auth/domain/schemas"

import { ASSIGNABLE_ROLES } from "./permissions"

const roleSchema = z.enum(ASSIGNABLE_ROLES, "Selecciona un rol.")

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: roleSchema,
})
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const createMemberAccountSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe su nombre.").max(120, "Máximo 120 caracteres."),
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
})
export type CreateMemberAccountInput = z.infer<typeof createMemberAccountSchema>

export const updateMemberRoleSchema = z.object({
  userId: z.uuid(),
  role: roleSchema,
})
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>

export const memberIdSchema = z.uuid()
export const invitationIdSchema = z.uuid()
export const invitationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/)
