import { describe, expect, it } from "vitest"

import { computeCartTotals } from "./cart"

describe("computeCartTotals", () => {
  it("adds lines, applies the discount and computes the profit", () => {
    const totals = computeCartTotals(
      [
        { quantity: 2, unitPrice: 10000, unitCost: 6000 },
        { quantity: 1, unitPrice: 5000, unitCost: 2000 },
      ],
      1000,
    )
    expect(totals).toEqual({
      subtotal: 25000,
      discount: 1000,
      total: 24000,
      cost: 14000,
      profit: 10000,
      margin: 10000 / 24000,
      units: 3,
    })
  })

  it("never discounts more than the subtotal", () => {
    expect(computeCartTotals([{ quantity: 1, unitPrice: 1000, unitCost: 500 }], 5000).total).toBe(0)
  })

  it("hides profit when costs are unknown", () => {
    const totals = computeCartTotals([{ quantity: 1, unitPrice: 1000, unitCost: null }], 0)
    expect(totals.cost).toBeNull()
    expect(totals.profit).toBeNull()
    expect(totals.margin).toBeNull()
  })
})
