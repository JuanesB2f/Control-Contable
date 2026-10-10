export type StockStatus = "out" | "low" | "ok"

export function stockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return "out"
  if (stock <= minStock) return "low"
  return "ok"
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  out: "Agotado",
  low: "Stock bajo",
  ok: "Disponible",
}

/** Days the current stock lasts at the pace of the last 30 days. Null when it hasn't sold. */
export function coverageDays(stock: number, unitsSold30d: number): number | null {
  if (unitsSold30d <= 0) return null
  return Math.floor(stock / (unitsSold30d / 30))
}

/** Same rule the database applies on purchases, used to preview the new cost before saving. */
export function weightedAverageCost(stock: number, currentCost: number, quantity: number, unitCost: number) {
  if (stock <= 0) return unitCost
  return Math.round(((stock * currentCost + quantity * unitCost) / (stock + quantity)) * 100) / 100
}

type ValuedProduct = { stock: number; costPrice: number | null; salePrice: number; isActive: boolean }

/** What the stock cost, what it would sell for and the profit still sitting on the shelves. */
export function inventoryValuation(products: ValuedProduct[]) {
  let costValue = 0
  let retailValue = 0
  let units = 0
  for (const product of products) {
    if (!product.isActive || product.stock <= 0) continue
    units += product.stock
    costValue += product.stock * (product.costPrice ?? 0)
    retailValue += product.stock * product.salePrice
  }
  return { units, costValue, retailValue, potentialProfit: retailValue - costValue }
}
