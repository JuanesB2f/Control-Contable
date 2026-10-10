import { describe, expect, it } from "vitest"

import { championThreshold, segmentCustomer } from "./segments"

const now = new Date("2026-10-09T12:00:00Z")
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

describe("championThreshold", () => {
  it("is the spend of the top 20% of buyers", () => {
    expect(championThreshold([100, 200, 300, 400, 500, 0])).toBe(500)
    expect(championThreshold([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])).toBe(900)
  })

  it("makes nobody a champion when nobody bought", () => {
    expect(championThreshold([0, 0])).toBe(Number.POSITIVE_INFINITY)
  })
})

describe("segmentCustomer", () => {
  const threshold = 500

  it("separates customers by recency, frequency and spend", () => {
    expect(segmentCustomer({ orders: 0, totalSpent: 0, firstPurchaseAt: null, lastPurchaseAt: null }, now, threshold)).toBe(
      "prospect",
    )
    expect(segmentCustomer({ orders: 5, totalSpent: 900, firstPurchaseAt: daysAgo(200), lastPurchaseAt: daysAgo(90) }, now, threshold)).toBe(
      "at_risk",
    )
    expect(segmentCustomer({ orders: 5, totalSpent: 900, firstPurchaseAt: daysAgo(200), lastPurchaseAt: daysAgo(3) }, now, threshold)).toBe(
      "champion",
    )
    expect(segmentCustomer({ orders: 4, totalSpent: 100, firstPurchaseAt: daysAgo(200), lastPurchaseAt: daysAgo(3) }, now, threshold)).toBe(
      "loyal",
    )
    expect(segmentCustomer({ orders: 1, totalSpent: 100, firstPurchaseAt: daysAgo(5), lastPurchaseAt: daysAgo(5) }, now, threshold)).toBe(
      "new",
    )
    expect(segmentCustomer({ orders: 2, totalSpent: 100, firstPurchaseAt: daysAgo(50), lastPurchaseAt: daysAgo(10) }, now, threshold)).toBe(
      "occasional",
    )
  })
})
