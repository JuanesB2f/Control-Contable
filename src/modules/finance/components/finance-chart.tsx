"use client"

import { useMemo } from "react"

import { ChartCanvas, cartesianScales, legendStyle, tooltipStyle, useChartTheme, type ChartSpec } from "@/components/charts/chart-canvas"
import { useOrgFormat } from "@/hooks/use-org-format"

export type FinancePoint = { key: string; label: string; revenue: number; cogs: number; expenses: number; net: number }

/** Two bars per day or month: what came in and what it cost; the tooltip says what's left. */
export function FinanceChart({ data }: { data: FinancePoint[] }) {
  const format = useOrgFormat()
  const theme = useChartTheme()

  const config = useMemo<ChartSpec<"bar">>(() => {
    const bar = { borderRadius: 6, borderSkipped: false, maxBarThickness: 22, categoryPercentage: 0.7, barPercentage: 0.9 } as const
    const tooltip = tooltipStyle<"bar">(theme, format.money)
    return {
      type: "bar",
      data: {
        labels: data.map((point) => point.label),
        datasets: [
          { ...bar, label: "Ventas", data: data.map((point) => point.revenue), backgroundColor: theme.series[0] },
          { ...bar, label: "Costo y gastos", data: data.map((point) => point.cogs + point.expenses), backgroundColor: theme.series[2] },
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        scales: cartesianScales(theme, format.compact),
        plugins: {
          legend: legendStyle(theme),
          tooltip: {
            ...tooltip,
            callbacks: {
              ...tooltip.callbacks,
              footer: ([item]) => (item ? `Te queda ${format.money(data[item.dataIndex]?.net ?? 0)}` : ""),
            },
          },
        },
      },
    }
  }, [data, theme, format])

  return <ChartCanvas config={config} label="Ventas comparadas con costos y gastos" className="h-60 sm:h-80" />
}
