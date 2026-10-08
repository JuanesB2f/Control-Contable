import { z } from "zod"

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120, "Máximo 120 caracteres."),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
