export const PERIOD_KEYS = ["7d", "30d", "90d", "12m"] as const
export type PeriodKey = (typeof PERIOD_KEYS)[number]
export type Bucket = "day" | "month"

export const PERIODS: Record<PeriodKey, { label: string; short: string; days: number; bucket: Bucket }> = {
  "7d": { label: "Últimos 7 días", short: "7 días", days: 7, bucket: "day" },
  "30d": { label: "Últimos 30 días", short: "30 días", days: 30, bucket: "day" },
  "90d": { label: "Últimos 90 días", short: "90 días", days: 90, bucket: "day" },
  "12m": { label: "Últimos 12 meses", short: "12 meses", days: 365, bucket: "month" },
}

export const DEFAULT_PERIOD: PeriodKey = "30d"

const DAY_MS = 24 * 60 * 60 * 1000

export function parsePeriod(value: unknown): PeriodKey {
  return PERIOD_KEYS.find((key) => key === value) ?? DEFAULT_PERIOD
}

export type ResolvedPeriod = {
  key: PeriodKey
  label: string
  bucket: Bucket
  from: Date
  to: Date
}

/** Rolling window ending now; the previous window of the same length is used for comparisons. */
export function resolvePeriod(key: PeriodKey, now: Date): ResolvedPeriod {
  const { days, bucket, label } = PERIODS[key]
  return { key, label, bucket, from: new Date(now.getTime() - days * DAY_MS), to: now }
}

/** "2026-10-09" for `date` as seen in `timezone`. */
export function localDateKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/** Every bucket key in the period, so charts show days without sales as zero instead of skipping them. */
export function bucketKeys(period: Pick<ResolvedPeriod, "from" | "to" | "bucket">, timezone: string): string[] {
  const keys = new Set<string>()
  for (let time = period.from.getTime(); time <= period.to.getTime(); time += DAY_MS) {
    const key = localDateKey(new Date(time), timezone)
    keys.add(period.bucket === "month" ? `${key.slice(0, 7)}-01` : key)
  }
  const last = localDateKey(period.to, timezone)
  keys.add(period.bucket === "month" ? `${last.slice(0, 7)}-01` : last)
  return [...keys].sort()
}

export function fillSeries<T extends { key: string }>(keys: string[], rows: T[], empty: (key: string) => T): T[] {
  const byKey = new Map(rows.map((row) => [row.key, row]))
  return keys.map((key) => byKey.get(key) ?? empty(key))
}

/** "9 oct" for days, "oct 2026" for months. Keys are calendar dates, so they're formatted in UTC. */
export function formatBucketLabel(key: string, bucket: Bucket, locale: string) {
  const [year, month, day] = key.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat(
    locale,
    bucket === "month" ? { month: "short", year: "2-digit", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" },
  ).format(date)
}

/** Relative change against the previous period; null when there is nothing to compare with. */
export function changeRatio(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / Math.abs(previous)
}
