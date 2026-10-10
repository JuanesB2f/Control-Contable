/** Due dates are calendar days ("YYYY-MM-DD") in the organization's timezone. */

const DAY_MS = 24 * 60 * 60 * 1000

/** Days a balance stays open by default when the seller doesn't pick a date. */
export const DEFAULT_CREDIT_DAYS = 15

export const CREDIT_TERM_OPTIONS = [8, 15, 30] as const

/** Balances due within this many days are flagged as coming up soon. */
const SOON_DAYS = 3

export type DueStatus = "overdue" | "today" | "soon" | "upcoming" | "none"

const toUtc = (key: string) => Date.parse(`${key}T00:00:00Z`)

export function addDays(key: string, days: number) {
  return new Date(toUtc(key) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Whole days from `fromKey` to `toKey`; negative when `toKey` is earlier. */
export function daysBetween(fromKey: string, toKey: string) {
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / DAY_MS)
}

export function dueStatus(dueDate: string | null, todayKey: string): { status: DueStatus; days: number } {
  if (!dueDate) return { status: "none", days: 0 }
  const days = daysBetween(todayKey, dueDate)
  if (days < 0) return { status: "overdue", days: -days }
  if (days === 0) return { status: "today", days }
  return { status: days <= SOON_DAYS ? "soon" : "upcoming", days }
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export function dueLabel({ status, days }: { status: DueStatus; days: number }) {
  switch (status) {
    case "overdue":
      return `Vencida hace ${plural(days, "día", "días")}`
    case "today":
      return "Vence hoy"
    case "soon":
    case "upcoming":
      return days === 1 ? "Vence mañana" : `Vence en ${plural(days, "día", "días")}`
    case "none":
      return "Sin fecha de pago"
  }
}

/** Formats a calendar day without shifting it through the viewer's timezone. */
export function formatDueDate(key: string, locale: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(new Date(toUtc(key)))
}
