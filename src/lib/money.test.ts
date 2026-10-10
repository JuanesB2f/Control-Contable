import { describe, expect, it } from "vitest"

import { formatMoney, parseDecimal, roundMoney } from "./money"

describe("parseDecimal", () => {
  it.each([
    ["12000", 12000],
    ["12.000", 12000],
    ["1.250.000", 1250000],
    ["$ 45.900", 45900],
    ["12.000,50", 12000.5],
    ["12,000.50", 12000.5],
    ["12,000", 12000],
    ["1.5", 1.5],
    ["0,75", 0.75],
    ["1.50", 1.5],
  ])("reads %s as %d", (input, expected) => {
    expect(parseDecimal(input)).toBe(expected)
  })

  it("passes numbers through", () => {
    expect(parseDecimal(3500)).toBe(3500)
  })

  it("returns NaN for text that is not a number", () => {
    expect(parseDecimal("")).toBeNaN()
    expect(parseDecimal("abc")).toBeNaN()
    expect(parseDecimal(null)).toBeNaN()
  })
})

describe("formatMoney", () => {
  it("hides decimals for whole amounts", () => {
    expect(formatMoney(12500, { currency: "COP", locale: "es-CO" })).not.toContain(",00")
  })

  it("keeps cents when present", () => {
    expect(formatMoney(10.5, { currency: "USD", locale: "en-US" })).toBe("$10.50")
  })
})

describe("roundMoney", () => {
  it("removes float noise", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
  })
})
