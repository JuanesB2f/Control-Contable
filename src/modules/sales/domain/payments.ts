import { z } from "zod"

import { roundMoney } from "@/lib/money"

import { BANK_REQUIRED, PAYMENT_METHODS, bankSchema, dueDateSchema, referenceSchema, type PaymentMethod } from "./schemas"

export const PAYMENT_RECEIPT_BUCKET = "payment-receipts"

/** Longest side, in pixels, of a stored receipt. Larger than product photos so small print stays legible. */
export const RECEIPT_MAX_SIDE = 1600

/** Banks and wallets people transfer from most often; anything else is typed by hand. */
export const COMMON_BANKS = [
  "Bancolombia",
  "Nequi",
  "Daviplata",
  "Davivienda",
  "Banco de Bogotá",
  "BBVA",
  "Banco de Occidente",
  "Banco Popular",
  "Banco Caja Social",
  "AV Villas",
  "Scotiabank Colpatria",
  "Banco Agrario",
  "Banco Falabella",
  "Itaú",
  "Nu",
  "Lulo Bank",
] as const

export type SalePayment = {
  id: string
  amount: number
  method: PaymentMethod
  bank: string | null
  reference: string | null
  note: string | null
  /** Short-lived signed URL; null when the payment has no receipt. */
  receiptUrl: string | null
  paidAt: string
  receivedBy: string | null
}

export type PaymentStatus = "paid" | "partial" | "pending"

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Pagada",
  partial: "Abonada",
  pending: "Sin abonos",
}

export function balanceDue(total: number, paid: number) {
  return Math.max(roundMoney(total - paid), 0)
}

export function paymentStatus(total: number, paid: number): PaymentStatus {
  if (balanceDue(total, paid) === 0) return "paid"
  return paid > 0 ? "partial" : "pending"
}

export const addSalePaymentSchema = z
  .object({
    saleId: z.uuid(),
    amount: z.number("Escribe el valor del abono.").positive("El abono debe ser mayor que cero.").max(100_000_000_000),
    method: z.enum(PAYMENT_METHODS, "Elige cómo te pagaron."),
    bank: bankSchema,
    reference: referenceSchema,
    note: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
    /** New promise date for whatever is still owed after this payment. */
    dueDate: dueDateSchema.optional(),
  })
  .refine((value) => value.method !== "transfer" || value.bank !== undefined, BANK_REQUIRED)

export type AddSalePaymentInput = z.infer<typeof addSalePaymentSchema>

export const setDueDateSchema = z.object({ saleId: z.uuid(), dueDate: dueDateSchema })

export type SetDueDateInput = z.infer<typeof setDueDateSchema>
