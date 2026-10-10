import { z } from "zod"

import { parseDecimal } from "@/lib/money"

const MAX_AMOUNT = 100_000_000_000

export const amountSchema = (message: string) =>
  z.preprocess(parseDecimal, z.number(message).min(0, "No puede ser negativo.").max(MAX_AMOUNT, "El valor es demasiado alto."))

export const quantitySchema = (message: string) =>
  z.preprocess(
    parseDecimal,
    z.number(message).int("Usa cantidades enteras.").min(0, "No puede ser negativo.").max(10_000_000, "Cantidad demasiado alta."),
  )

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .optional()
    .transform((value) => value || undefined)

const productFields = {
  name: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(120, "Máximo 120 caracteres."),
  sku: optionalText(40),
  category: optionalText(60),
  costPrice: amountSchema("Escribe cuánto te cuesta."),
  salePrice: amountSchema("Escribe el precio de venta."),
  minStock: quantitySchema("Escribe el stock mínimo."),
}

export const createProductSchema = z.object({
  ...productFields,
  initialStock: quantitySchema("Escribe cuántas unidades tienes."),
})

export type CreateProductInput = z.input<typeof createProductSchema>
export type CreateProductValues = z.output<typeof createProductSchema>

export const updateProductSchema = z.object({
  ...productFields,
  productId: z.uuid(),
  isActive: z.boolean(),
})

export type UpdateProductInput = z.input<typeof updateProductSchema>
