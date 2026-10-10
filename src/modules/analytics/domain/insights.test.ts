import { describe, expect, it } from "vitest"

import { createMoneyFormatter } from "@/lib/money"

import { buildHeatmap, paretoCount, type SalesAnalytics } from "./analytics"
import { buildInsights } from "./insights"

const format = createMoneyFormatter({ currency: "COP", locale: "es-CO" })

const analytics: SalesAnalytics = {
  canSeeCosts: true,
  summary: { revenue: 1000, salesCount: 10, discounts: 0, customers: 3, units: 20, cost: 600, profit: 400 },
  previous: { revenue: 500, salesCount: 5, profit: 200 },
  series: [],
  topProducts: [
    { productId: "a", name: "Colágeno", units: 10, revenue: 700, profit: 300 },
    { productId: "b", name: "Omega 3", units: 6, revenue: 200, profit: 60 },
    { productId: "c", name: "Vitamina C", units: 4, revenue: 100, profit: 40 },
  ],
  topCustomers: [{ customerId: "x", name: "María", orders: 4, total: 600, lastPurchaseAt: "2026-10-01T00:00:00Z" }],
  heatmap: [
    { weekday: 6, hour: 16, salesCount: 4, revenue: 600 },
    { weekday: 1, hour: 10, salesCount: 6, revenue: 400 },
  ],
  paymentMethods: [],
}

describe("buildHeatmap", () => {
  it("groups hours into bands per weekday", () => {
    const { cells, max } = buildHeatmap(analytics.heatmap)
    expect(cells).toHaveLength(49)
    expect(max).toBe(600)
  })
})

describe("paretoCount", () => {
  it("finds how many products make 80% of revenue", () => {
    expect(paretoCount(analytics.topProducts, 1000)).toBe(2)
    expect(paretoCount([], 0)).toBeNull()
  })
})

describe("buildInsights", () => {
  it("explains the period in plain language", () => {
    const insights = buildInsights({ analytics, runningOut: [{ name: "Omega 3", days: 3 }], format })
    const kinds = insights.map((insight) => insight.kind)

    expect(kinds[0]).toBe("stock")
    expect(kinds).toEqual(expect.arrayContaining(["growth", "margin", "star", "pareto", "timing", "customer"]))
    expect(insights.find((insight) => insight.kind === "star")?.title).toContain("Colágeno")
    expect(insights.find((insight) => insight.kind === "timing")?.title).toContain("sábado")
  })

  it("only warns about stock when there are no sales yet", () => {
    const empty = { ...analytics, summary: { ...analytics.summary, salesCount: 0, revenue: 0 } }
    expect(buildInsights({ analytics: empty, runningOut: [], format })).toEqual([])
  })
})
