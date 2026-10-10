import { describe, expect, it } from "vitest"

import { coverageDays, inventoryValuation, stockStatus, weightedAverageCost } from "./stock"

describe("stockStatus", () => {
  it("flags empty and low stock", () => {
    expect(stockStatus(0, 5)).toBe("out")
    expect(stockStatus(5, 5)).toBe("low")
    expect(stockStatus(6, 5)).toBe("ok")
  })
})

describe("coverageDays", () => {
  it("projects how long stock lasts at the current pace", () => {
    expect(coverageDays(30, 60)).toBe(15)
    expect(coverageDays(10, 0)).toBeNull()
  })
})

describe("weightedAverageCost", () => {
  it("blends the old and new purchase cost", () => {
    expect(weightedAverageCost(10, 5000, 10, 7000)).toBe(6000)
  })

  it("takes the purchase cost when there was no stock", () => {
    expect(weightedAverageCost(0, 5000, 4, 8000)).toBe(8000)
  })
})

describe("inventoryValuation", () => {
  it("values active stock at cost and at sale price", () => {
    const result = inventoryValuation([
      { stock: 10, costPrice: 6000, salePrice: 10000, isActive: true },
      { stock: 2, costPrice: 1000, salePrice: 2500, isActive: true },
      { stock: 50, costPrice: 1000, salePrice: 2000, isActive: false },
    ])
    expect(result).toEqual({ units: 12, costValue: 62000, retailValue: 105000, potentialProfit: 43000 })
  })
})
