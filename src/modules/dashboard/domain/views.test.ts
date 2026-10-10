import { describe, expect, it } from "vitest"

import { DASHBOARD_VIEWS, dashboardParams, resolveDashboardView } from "./views"

describe("resolveDashboardView", () => {
  it("returns the requested view when allowed", () => {
    expect(resolveDashboardView("finance", DASHBOARD_VIEWS)).toBe("finance")
  })

  it("falls back to the overview for unknown or forbidden views", () => {
    expect(resolveDashboardView("finance", ["overview", "sales"])).toBe("overview")
    expect(resolveDashboardView("nope", DASHBOARD_VIEWS)).toBe("overview")
    expect(resolveDashboardView(undefined, DASHBOARD_VIEWS)).toBe("overview")
  })
})

describe("dashboardParams", () => {
  it("keeps the overview URL bare and only carries the period where it applies", () => {
    expect(dashboardParams("overview")).toEqual({})
    expect(dashboardParams("overview", "7d")).toEqual({ period: "7d" })
    expect(dashboardParams("sales", "7d")).toEqual({ view: "sales", period: "7d" })
    expect(dashboardParams("inventory", "7d")).toEqual({ view: "inventory" })
  })
})
