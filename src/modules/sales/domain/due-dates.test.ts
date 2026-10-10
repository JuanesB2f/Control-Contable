import { describe, expect, it } from "vitest"

import { addDays, daysBetween, dueLabel, dueStatus, formatDueDate } from "./due-dates"

describe("addDays / daysBetween", () => {
  it("moves across months and years", () => {
    expect(addDays("2026-10-25", 15)).toBe("2026-11-09")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(daysBetween("2026-10-09", "2026-10-24")).toBe(15)
    expect(daysBetween("2026-10-09", "2026-10-06")).toBe(-3)
  })
})

describe("dueStatus", () => {
  const today = "2026-10-09"

  it("flags overdue, today, soon and later balances", () => {
    expect(dueStatus("2026-10-06", today)).toEqual({ status: "overdue", days: 3 })
    expect(dueStatus("2026-10-09", today)).toEqual({ status: "today", days: 0 })
    expect(dueStatus("2026-10-11", today)).toEqual({ status: "soon", days: 2 })
    expect(dueStatus("2026-10-24", today)).toEqual({ status: "upcoming", days: 15 })
    expect(dueStatus(null, today)).toEqual({ status: "none", days: 0 })
  })
})

describe("dueLabel", () => {
  it("reads naturally in Spanish", () => {
    expect(dueLabel({ status: "overdue", days: 1 })).toBe("Vencida hace 1 día")
    expect(dueLabel({ status: "overdue", days: 4 })).toBe("Vencida hace 4 días")
    expect(dueLabel({ status: "today", days: 0 })).toBe("Vence hoy")
    expect(dueLabel({ status: "soon", days: 1 })).toBe("Vence mañana")
    expect(dueLabel({ status: "upcoming", days: 15 })).toBe("Vence en 15 días")
  })
})

describe("formatDueDate", () => {
  it("keeps the calendar day regardless of timezone", () => {
    expect(formatDueDate("2026-10-24", "es-CO", { day: "numeric", month: "numeric" })).toBe("24/10")
  })
})
