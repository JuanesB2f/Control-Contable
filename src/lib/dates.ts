/** Hour of day (0-23) for `date` in the given IANA timezone. */
export function hourInTimezone(date: Date, timezone: string) {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(date))
}

export function greetingFor(date: Date, timezone: string) {
  const hour = hourInTimezone(date, timezone)
  if (hour >= 5 && hour < 12) return "Buenos días"
  if (hour >= 12 && hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
]

/** "hace 5 minutos", "en 3 días", "ahora". */
export function formatRelativeTime(value: string | Date, now: Date = new Date(), locale = "es") {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) return formatter.format(Math.trunc(seconds / unitSeconds), unit)
  }
  return "ahora"
}

export function formatDate(value: string | Date, timezone: string, locale = "es-CO") {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: timezone }).format(
    new Date(value),
  )
}

export function formatDateTime(value: string | Date, timezone: string, locale = "es-CO") {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(
    new Date(value),
  )
}
