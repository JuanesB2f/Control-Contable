import { roundMoney } from "@/lib/money"

export type CartLine = {
  quantity: number
  unitPrice: number
  /** Null when the seller can't see costs. */
  unitCost: number | null
}

export type CartTotals = {
  subtotal: number
  discount: number
  total: number
  cost: number | null
  profit: number | null
  margin: number | null
  units: number
}

/** Same arithmetic the database applies in `create_sale`, used to preview the sale while building it. */
export function computeCartTotals(lines: CartLine[], discount: number): CartTotals {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))
  const appliedDiscount = Math.min(Math.max(discount || 0, 0), subtotal)
  const total = roundMoney(subtotal - appliedDiscount)
  const knowsCost = lines.every((line) => line.unitCost !== null)
  const cost = knowsCost ? roundMoney(lines.reduce((sum, line) => sum + line.quantity * (line.unitCost ?? 0), 0)) : null
  const profit = cost === null ? null : roundMoney(total - cost)

  return {
    subtotal,
    discount: appliedDiscount,
    total,
    cost,
    profit,
    margin: profit === null || total <= 0 ? null : profit / total,
    units: lines.reduce((sum, line) => sum + line.quantity, 0),
  }
}
