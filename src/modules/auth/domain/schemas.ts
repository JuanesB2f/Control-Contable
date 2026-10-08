import { z } from "zod"

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Escribe un correo válido.").max(254, "Correo demasiado largo."))

export const passwordSchema = z
  .string()
  .min(8, "Usa al menos 8 caracteres.")
  .max(72, "Máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Incluye al menos una letra.")
  .regex(/\d/, "Incluye al menos un número.")

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña."),
})
export type SignInInput = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120, "Máximo 120 caracteres."),
  email: emailSchema,
  password: passwordSchema,
})
export type SignUpInput = z.infer<typeof signUpSchema>

export const forgotPasswordSchema = z.object({ email: emailSchema })
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  })
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
