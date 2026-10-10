import { z } from "zod"

import type { Enums } from "@/types/database"

import type { SalePayment } from "./payments"

export const PAYMENT_METHODS = ["cash", "card", "transfer", "other"] as const satisfies readonly Enums<"payment_method">[]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
}

export const bankSchema = z.string().trim().min(2, "Escribe el nombre del banco.").max(60, "Máximo 60 caracteres.").optional()
export const referenceSchema = z.string().trim().max(60, "Máximo 60 caracteres.").optional()
export const BANK_REQUIRED = { message: "Elige el banco de la transferencia.", path: ["bank"] }
export const dueDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha válida.")

export const createSaleSchema = z
  .object({
    customerId: z.uuid().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS, "Elige cómo te pagaron."),
    discount: z.number().min(0, "El descuento no puede ser negativo.").max(100_000_000_000),
    notes: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
    /** What the customer pays now. Omitted means the whole total; less leaves a balance on the customer. */
    paidAmount: z.number().min(0, "El abono no puede ser negativo.").max(100_000_000_000).optional(),
    bank: bankSchema,
    reference: referenceSchema,
    /** When the customer promised to pay the balance. Only used when something is left owing. */
    dueDate: dueDateSchema.optional(),
    items: z
      .array(
        z.object({
          productId: z.uuid(),
          quantity: z.number().int("Usa cantidades enteras.").min(1).max(10_000_000),
          unitPrice: z.number().min(0, "El precio no puede ser negativo.").max(100_000_000_000),
        }),
      )
      .min(1, "Agrega al menos un producto.")
      .max(100, "Máximo 100 productos por venta."),
  })
  .refine((value) => value.paidAmount === undefined || value.customerId !== undefined, {
    message: "Elige el cliente para dejarle el saldo pendiente.",
    path: ["customerId"],
  })
  .refine(
    (value) => value.paymentMethod !== "transfer" || value.paidAmount === 0 || value.bank !== undefined,
    BANK_REQUIRED,
  )

export type CreateSaleInput = z.infer<typeof createSaleSchema>

export const voidSaleSchema = z.object({
  saleId: z.uuid(),
  reason: z.string().trim().min(3, "Cuéntanos brevemente por qué.").max(200, "Máximo 200 caracteres."),
})

export type VoidSaleInput = z.infer<typeof voidSaleSchema>

export type SaleItem = {
  productId: string | null
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
  unitCost: number | null
}

export type Sale = {
  id: string
  number: number
  status: Enums<"sale_status">
  paymentMethod: PaymentMethod
  customerId: string | null
  customerName: string | null
  sellerName: string | null
  subtotal: number
  discount: number
  total: number
  paidTotal: number
  /** Day the balance is due ("YYYY-MM-DD"); null when paid or no date was set. */
  dueDate: string | null
  /** Null when the viewer can't see costs. */
  profit: number | null
  notes: string | null
  soldAt: string
  voidedAt: string | null
  voidReason: string | null
  items: SaleItem[]
  /** Oldest first. */
  payments: SalePayment[]
}
