import { z } from "zod"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .optional()
    .transform((value) => value || undefined)

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(120, "Máximo 120 caracteres."),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Máximo 254 caracteres.")
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.email("Escribe un correo válido.").optional()),
  document: optionalText(30),
  notes: optionalText(500),
})

export type CustomerInput = z.input<typeof customerSchema>

export const customerIdSchema = z.uuid()

export type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  notes: string | null
  createdAt: string
  orders: number
  totalSpent: number
  firstPurchaseAt: string | null
  lastPurchaseAt: string | null
  favoriteProduct: string | null
  /** What they still owe across their sales. */
  balanceDue: number
}
