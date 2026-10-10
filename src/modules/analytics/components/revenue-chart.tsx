"use client"

import type { ChartDataset } from "chart.js"
import { useMemo } from "react"

import {
  ChartCanvas,
  cartesianScales,
  legendStyle,
  tooltipStyle,
  useChartTheme,
  verticalFade,
  type ChartSpec,
} from "@/components/charts/chart-canvas"
import { useOrgFormat } from "@/hooks/use-org-format"

export type RevenuePoint = { key: string; label: string; revenue: number; profit: number | null }

function line(label: string, data: number[], color: string): ChartDataset<"line"> {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: verticalFade(color),
    borderWidth: 2.5,
    fill: true,
    tension: 0.35,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: "#ffffff",
    pointHoverBorderWidth: 2,
  }
}

export function RevenueChart({ data, showProfit }: { data: RevenuePoint[]; showProfit: boolean }) {
  const format = useOrgFormat()
  const theme = useChartTheme()

  const config = useMemo<ChartSpec<"line">>(
    () => ({
      type: "line",
      data: {
        labels: data.map((point) => point.label),
        datasets: [
          line("Ventas", data.map((point) => point.revenue), theme.series[0]),
          ...(showProfit ? [line("Ganancia", data.map((point) => point.profit ?? 0), theme.series[2])] : []),
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        scales: cartesianScales(theme, format.compact),
        plugins: {
          legend: showProfit ? legendStyle(theme) : { display: false },
          tooltip: tooltipStyle(theme, format.money),
        },
      },
    }),
    [data, showProfit, theme, format],
  )

  return <ChartCanvas config={config} label={showProfit ? "Ventas y ganancia en el periodo" : "Ventas en el periodo"} className="h-56 sm:h-72" />
}
