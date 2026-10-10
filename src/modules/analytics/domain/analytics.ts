import type { PaymentMethod } from "@/modules/sales/domain/schemas"

export type SalesAnalytics = {
  canSeeCosts: boolean
  summary: {
    revenue: number
    salesCount: number
    discounts: number
    customers: number
    units: number
    cost: number | null
    profit: number | null
  }
  previous: { revenue: number; salesCount: number; profit: number | null }
  series: { key: string; revenue: number; profit: number | null; salesCount: number }[]
  topProducts: { productId: string | null; name: string; units: number; revenue: number; profit: number | null }[]
  topCustomers: { customerId: string; name: string; orders: number; total: number; lastPurchaseAt: string }[]
  /** weekday: 1 (Monday) … 7 (Sunday), hour: 0…23 in the organization's timezone. */
  heatmap: { weekday: number; hour: number; salesCount: number; revenue: number }[]
  paymentMethods: { method: PaymentMethod; salesCount: number; total: number }[]
}

export const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const
/** Hours grouped in blocks of 3, so the busiest moment of the week is a readable time range. */
export const HOUR_BANDS = [
  { start: 6, end: 9 },
  { start: 9, end: 12 },
  { start: 12, end: 15 },
  { start: 15, end: 18 },
  { start: 18, end: 21 },
  { start: 21, end: 24 },
  { start: 0, end: 6 },
] as const

export type HeatmapCell = { weekday: number; band: number; revenue: number; salesCount: number }

export function buildHeatmap(rows: SalesAnalytics["heatmap"]): { cells: HeatmapCell[]; max: number } {
  const cells: HeatmapCell[] = []
  for (let weekday = 1; weekday <= 7; weekday++) {
    HOUR_BANDS.forEach((band, bandIndex) => {
      const matching = rows.filter((row) => row.weekday === weekday && row.hour >= band.start && row.hour < band.end)
      cells.push({
        weekday,
        band: bandIndex,
        revenue: matching.reduce((sum, row) => sum + row.revenue, 0),
        salesCount: matching.reduce((sum, row) => sum + row.salesCount, 0),
      })
    })
  }
  return { cells, max: Math.max(0, ...cells.map((cell) => cell.revenue)) }
}

/** Smallest group of products that adds up to 80% of revenue (the 80/20 rule). */
export function paretoCount(topProducts: SalesAnalytics["topProducts"], totalRevenue: number) {
  if (totalRevenue <= 0) return null
  let accumulated = 0
  for (const [index, product] of topProducts.entries()) {
    accumulated += product.revenue
    if (accumulated >= totalRevenue * 0.8) return index + 1
  }
  return null
}
