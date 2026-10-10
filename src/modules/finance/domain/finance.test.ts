import { describe, expect, it } from "vitest"

import { breakEvenRevenue, cashFlow, expenseSchema, profitAndLoss } from "./finance"

describe("profitAndLoss", () => {
  it("goes from sales to net profit", () => {
    expect(profitAndLoss({ revenue: 1000, cogs: 600, expenses: 150 })).toEqual({
      revenue: 1000,
      cogs: 600,
      grossProfit: 400,
      expenses: 150,
      netProfit: 250,
      grossMargin: 0.4,
      netMargin: 0.25,
    })
  })

  it("has no margins without sales", () => {
    expect(profitAndLoss({ revenue: 0, cogs: 0, expenses: 100 }).netMargin).toBeNull()
  })
})

describe("breakEvenRevenue", () => {
  it("divides expenses by the gross margin", () => {
    expect(breakEvenRevenue(400, 0.4)).toBe(1000)
  })

  it("is unreachable without a positive margin", () => {
    expect(breakEvenRevenue(400, null)).toBeNull()
    expect(breakEvenRevenue(400, -0.1)).toBeNull()
  })
})

describe("cashFlow", () => {
  it("counts inventory purchases as money out", () => {
    expect(cashFlow({ collected: 1000, purchases: 700, expenses: 100 })).toEqual({ inflow: 1000, outflow: 800, net: 200 })
  })

  it("only counts money actually received, not sales on credit", () => {
    expect(cashFlow({ collected: 300, purchases: 0, expenses: 0 }).inflow).toBe(300)
  })
})

describe("expenseSchema", () => {
  it("reads typed amounts and rejects zero", () => {
    const valid = expenseSchema.safeParse({ category: "rent", description: "Local", amount: "1.200.000", spentOn: "2026-10-01" })
    expect(valid.success && valid.data.amount).toBe(1200000)
    expect(expenseSchema.safeParse({ category: "rent", description: "Local", amount: "0", spentOn: "2026-10-01" }).success).toBe(false)
  })
})
