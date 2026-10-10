import { describe, expect, it } from "vitest"

import { bucketKeys, changeRatio, fillSeries, formatBucketLabel, localDateKey, parsePeriod, resolvePeriod } from "./period"

describe("parsePeriod", () => {
  it("accepts known keys and falls back to 30 days", () => {
    expect(parsePeriod("7d")).toBe("7d")
    expect(parsePeriod("12m")).toBe("12m")
    expect(parsePeriod("bogus")).toBe("30d")
    expect(parsePeriod(undefined)).toBe("30d")
  })
})

describe("localDateKey", () => {
  it("uses the organization's timezone, not UTC", () => {
    // 2026-10-10 03:00 UTC is still Oct 9 in Bogotá (UTC-5).
    expect(localDateKey(new Date("2026-10-10T03:00:00Z"), "America/Bogota")).toBe("2026-10-09")
  })
})

describe("bucketKeys", () => {
  const now = new Date("2026-10-09T20:00:00Z")

  it("lists every day of a 7 day window", () => {
    const keys = bucketKeys(resolvePeriod("7d", now), "America/Bogota")
    expect(keys.at(-1)).toBe("2026-10-09")
    expect(keys).toHaveLength(8)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("lists months for the yearly view", () => {
    const keys = bucketKeys(resolvePeriod("12m", now), "America/Bogota")
    expect(keys.every((key) => key.endsWith("-01"))).toBe(true)
    expect(keys.at(-1)).toBe("2026-10-01")
    expect(keys).toHaveLength(13)
  })
})

describe("fillSeries", () => {
  it("fills gaps with empty rows", () => {
    const filled = fillSeries(["a", "b", "c"], [{ key: "b", value: 5 }], (key) => ({ key, value: 0 }))
    expect(filled).toEqual([
      { key: "a", value: 0 },
      { key: "b", value: 5 },
      { key: "c", value: 0 },
    ])
  })
})

describe("formatBucketLabel", () => {
  it("does not shift the day across timezones", () => {
    expect(formatBucketLabel("2026-10-01", "day", "es-CO")).toContain("1")
  })
})

describe("changeRatio", () => {
  it("compares against the previous period", () => {
    expect(changeRatio(150, 100)).toBe(0.5)
    expect(changeRatio(50, 100)).toBe(-0.5)
    expect(changeRatio(0, 0)).toBe(0)
    expect(changeRatio(10, 0)).toBeNull()
  })
})
