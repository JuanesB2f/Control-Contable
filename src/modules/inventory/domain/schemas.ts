import { z } from "zod"

import { parseDecimal } from "@/lib/money"
import { amountSchema } from "@/modules/products/domain/schemas"

const note = z.string().trim().max(200, "Máximo 200 caracteres.").optional()

export const purchaseSchema = z.object({
  productId: z.uuid(),
  quantity: z.preprocess(
    parseDecimal,
    z.number("Escribe cuántas unidades compraste.").int("Usa cantidades enteras.").min(1, "Compra al menos 1 unidad.").max(10_000_000),
  ),
  unitCost: amountSchema("Escribe cuánto pagaste por unidad."),
  note,
})

export type PurchaseInput = z.input<typeof purchaseSchema>

export const adjustmentSchema = z.object({
  productId: z.uuid(),
  /** Units actually counted on the shelf; the difference becomes the adjustment. */
  countedStock: z.preprocess(
    parseDecimal,
    z.number("Escribe cuántas unidades contaste.").int("Usa cantidades enteras.").min(0, "No puede ser negativo.").max(10_000_000),
  ),
  note,
})

export type AdjustmentInput = z.input<typeof adjustmentSchema>

export const STOCK_MOVEMENT_LABELS = {
  opening: "Inventario inicial",
  purchase: "Compra",
  sale: "Venta",
  adjustment: "Ajuste",
  void: "Devolución por anulación",
} as const

export type StockMovementType = keyof typeof STOCK_MOVEMENT_LABELS
