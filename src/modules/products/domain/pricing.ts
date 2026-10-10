/** Share of the sale price that is profit: (price − cost) / price. */
export function marginRatio(cost: number, price: number) {
  return price > 0 ? (price - cost) / price : 0
}

/** Profit relative to cost: (price − cost) / cost. Null when the product cost nothing. */
export function markupRatio(cost: number, price: number) {
  return cost > 0 ? (price - cost) / cost : null
}

export function unitProfit(cost: number, price: number) {
  return price - cost
}

/** Price needed to keep `margin` (0..1) of every sale. */
export function priceForMargin(cost: number, margin: number) {
  if (margin >= 1 || cost <= 0) return null
  return cost / (1 - margin)
}

const WHOLE_PESO_CURRENCIES = new Set(["COP", "CLP", "PYG"])

/** Rounds suggested prices up to amounts people actually charge ($ 12.400, not $ 12.371). */
export function roundPriceUp(value: number, currency: string) {
  const step = WHOLE_PESO_CURRENCIES.has(currency) ? 100 : 0.5
  return Math.ceil(value / step) * step
}

export type MarginHealth = "loss" | "thin" | "healthy" | "great"

export function marginHealth(ratio: number): MarginHealth {
  if (ratio < 0) return "loss"
  if (ratio < 0.15) return "thin"
  if (ratio < 0.4) return "healthy"
  return "great"
}

export const MARGIN_HEALTH_LABELS: Record<MarginHealth, string> = {
  loss: "Pierdes dinero",
  thin: "Margen bajo",
  healthy: "Margen sano",
  great: "Margen alto",
}

export const TARGET_MARGINS = [0.2, 0.3, 0.4, 0.5] as const
