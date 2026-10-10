import { describe, expect, it } from "vitest"

import { marginHealth, marginRatio, markupRatio, priceForMargin, roundPriceUp, unitProfit } from "./pricing"

describe("pricing", () => {
  it("computes margin and markup from what you paid and what you charge", () => {
    expect(marginRatio(6000, 10000)).toBe(0.4)
    expect(markupRatio(6000, 10000)).toBeCloseTo(0.6667, 4)
    expect(unitProfit(6000, 10000)).toBe(4000)
  })

  it("handles free products and zero prices", () => {
    expect(markupRatio(0, 5000)).toBeNull()
    expect(marginRatio(1000, 0)).toBe(0)
  })

  it("suggests the price that keeps a target margin", () => {
    expect(priceForMargin(6000, 0.4)).toBe(10000)
    expect(priceForMargin(6000, 1)).toBeNull()
  })

  it("rounds suggestions to chargeable amounts", () => {
    expect(roundPriceUp(12371, "COP")).toBe(12400)
    expect(roundPriceUp(12.31, "USD")).toBe(12.5)
  })

  it("classifies margin health", () => {
    expect(marginHealth(-0.1)).toBe("loss")
    expect(marginHealth(0.1)).toBe("thin")
    expect(marginHealth(0.3)).toBe("healthy")
    expect(marginHealth(0.55)).toBe("great")
  })
})
