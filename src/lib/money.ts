type FormatOptions = { currency: string; locale: string }

/** "$ 12.500" — decimals only when the amount has cents. */
export function formatMoney(value: number, { currency, locale }: FormatOptions) {
  const digits = Number.isInteger(Math.round(value * 100) / 100) ? 0 : 2
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** "$ 1,2 M" — for chart axes and dense cards. */
export function formatCompactMoney(value: number, { currency, locale }: FormatOptions) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

/** `ratio` is 0..1 (0.25 → "25 %"). */
export function formatPercent(ratio: number, locale: string, digits = 0) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(ratio)
}

export type MoneyFormatter = {
  money: (value: number) => string
  compact: (value: number) => string
  number: (value: number) => string
  percent: (ratio: number, digits?: number) => string
}

export function createMoneyFormatter(options: FormatOptions): MoneyFormatter {
  return {
    money: (value) => formatMoney(value, options),
    compact: (value) => formatCompactMoney(value, options),
    number: (value) => formatNumber(value, options.locale),
    percent: (ratio, digits) => formatPercent(ratio, options.locale, digits),
  }
}

const THOUSANDS_WITH_DOTS = /^\d{1,3}(\.\d{3})+$/
const THOUSANDS_WITH_COMMAS = /^\d{1,3}(,\d{3})+$/

/**
 * Reads amounts the way people type them in Latin America: "12.000" is twelve
 * thousand, "12.000,50" and "12,000.50" both have cents, "1.5" is one and a half.
 * Returns NaN when the text is not a number.
 */
export function parseDecimal(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value !== "string") return Number.NaN

  let text = value.replace(/[^\d.,-]/g, "")
  if (!text) return Number.NaN

  const lastDot = text.lastIndexOf(".")
  const lastComma = text.lastIndexOf(",")

  if (lastDot !== -1 && lastComma !== -1) {
    const decimal = lastDot > lastComma ? "." : ","
    const thousands = decimal === "." ? "," : "."
    text = text.replaceAll(thousands, "").replace(decimal, ".")
  } else if (lastDot !== -1) {
    if (THOUSANDS_WITH_DOTS.test(text.replace("-", ""))) text = text.replaceAll(".", "")
  } else if (lastComma !== -1) {
    text = THOUSANDS_WITH_COMMAS.test(text.replace("-", "")) ? text.replaceAll(",", "") : text.replace(",", ".")
  }

  return text === "" || text === "-" ? Number.NaN : Number(text)
}

/** Rounds to cents so float noise never reaches the database. */
export function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
