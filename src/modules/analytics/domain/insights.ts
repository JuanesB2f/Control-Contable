import type { MoneyFormatter } from "@/lib/money"

import { WEEKDAY_LABELS, buildHeatmap, HOUR_BANDS, paretoCount, type SalesAnalytics } from "./analytics"
import { changeRatio } from "./period"

export type InsightKind = "growth" | "decline" | "margin" | "star" | "timing" | "customer" | "stock" | "pareto"

export type Insight = { kind: InsightKind; title: string; detail: string }

type InsightInput = {
  analytics: SalesAnalytics
  /** Products that run out within a week at the current pace. */
  runningOut: { name: string; days: number }[]
  format: MoneyFormatter
}

/** Plain-language observations about the period, most useful first. */
export function buildInsights({ analytics, runningOut, format }: InsightInput): Insight[] {
  const insights: Insight[] = []
  const { summary, previous } = analytics

  if (runningOut.length > 0) {
    const [first] = runningOut
    insights.push({
      kind: "stock",
      title:
        runningOut.length === 1
          ? `${first.name} se agota ${first.days <= 0 ? "hoy" : `en ~${first.days} ${first.days === 1 ? "día" : "días"}`}`
          : `${runningOut.length} productos se agotan esta semana`,
      detail: "Al ritmo de ventas de los últimos 30 días. Reabastece antes de perder ventas.",
    })
  }

  if (summary.salesCount === 0) return insights

  const growth = changeRatio(summary.revenue, previous.revenue)
  if (growth !== null && Math.abs(growth) >= 0.05 && previous.revenue > 0) {
    insights.push({
      kind: growth > 0 ? "growth" : "decline",
      title: `Vendes ${format.percent(Math.abs(growth))} ${growth > 0 ? "más" : "menos"} que el periodo anterior`,
      detail: `${format.money(summary.revenue)} frente a ${format.money(previous.revenue)}.`,
    })
  }

  if (summary.profit !== null && summary.revenue > 0) {
    const keptPerHundred = (summary.profit / summary.revenue) * 100
    insights.push({
      kind: "margin",
      title: `De cada ${format.money(100)} que vendes, te quedan ${format.money(Math.round(keptPerHundred))}`,
      detail: `Ganancia bruta de ${format.money(summary.profit)} después de pagar lo que costaron los productos.`,
    })
  }

  const [star] = analytics.topProducts
  if (star && summary.revenue > 0) {
    const share = star.revenue / summary.revenue
    insights.push({
      kind: "star",
      title: `${star.name} es tu producto estrella`,
      detail:
        star.profit !== null && summary.profit
          ? `Aporta el ${format.percent(share)} de tus ventas y el ${format.percent(star.profit / summary.profit)} de tu ganancia.`
          : `Aporta el ${format.percent(share)} de tus ventas con ${format.number(star.units)} unidades.`,
    })
  }

  const pareto = paretoCount(analytics.topProducts, summary.revenue)
  if (pareto !== null && pareto < analytics.topProducts.length) {
    insights.push({
      kind: "pareto",
      title: `${pareto} ${pareto === 1 ? "producto genera" : "productos generan"} el 80% de tus ventas`,
      detail: "Nunca dejes que se agoten: son los que sostienen tu negocio.",
    })
  }

  const { cells, max } = buildHeatmap(analytics.heatmap)
  const peak = cells.find((cell) => cell.revenue === max && max > 0)
  if (peak) {
    const band = HOUR_BANDS[peak.band]
    insights.push({
      kind: "timing",
      title: `Tu momento fuerte: ${WEEKDAY_LABELS[peak.weekday - 1].toLowerCase()} de ${band.start}:00 a ${band.end}:00`,
      detail: "Ten más stock y personal disponible en ese horario.",
    })
  }

  const [bestCustomer] = analytics.topCustomers
  if (bestCustomer) {
    insights.push({
      kind: "customer",
      title: `${bestCustomer.name} es quien más te compra`,
      detail: `${bestCustomer.orders} ${bestCustomer.orders === 1 ? "compra" : "compras"} por ${format.money(bestCustomer.total)} en este periodo.`,
    })
  }

  return insights
}
