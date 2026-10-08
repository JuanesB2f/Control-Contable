import { describe, expect, it } from "vitest"

import { formatRelativeTime, greetingFor, hourInTimezone } from "./dates"

describe("hourInTimezone", () => {
  it("converts to the organization's local hour", () => {
    expect(hourInTimezone(new Date("2026-10-07T12:00:00Z"), "America/Bogota")).toBe(7)
    expect(hourInTimezone(new Date("2026-10-07T12:00:00Z"), "Europe/Madrid")).toBe(14)
  })
})

describe("greetingFor", () => {
  it.each([
    ["2026-10-07T13:00:00Z", "Buenos días"],
    ["2026-10-07T20:00:00Z", "Buenas tardes"],
    ["2026-10-08T03:00:00Z", "Buenas noches"],
  ])("%s in Bogotá → %s", (iso, greeting) => {
    expect(greetingFor(new Date(iso), "America/Bogota")).toBe(greeting)
  })
})

describe("formatRelativeTime", () => {
  const now = new Date("2026-10-07T12:00:00Z")

  it("uses natural Spanish phrases", () => {
    expect(formatRelativeTime("2026-10-07T11:59:30Z", now)).toBe("ahora")
    expect(formatRelativeTime("2026-10-07T11:55:00Z", now)).toBe("hace 5 minutos")
    expect(formatRelativeTime("2026-10-06T12:00:00Z", now)).toBe("ayer")
  })
})
