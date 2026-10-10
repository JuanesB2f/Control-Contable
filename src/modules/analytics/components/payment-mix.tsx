"use client"

import { useMemo } from "react"

import { ChartCanvas, tooltipStyle, useChartTheme, type ChartSpec } from "@/components/charts/chart-canvas"
import { useOrgFormat } from "@/hooks/use-org-format"
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/modules/sales/domain/schemas"

import type { SalesAnalytics } from "../domain/analytics"

/** Index into the chart palette; the legend dots use the matching --chart-* variable. */
const SERIES_INDEX: Record<PaymentMethod, 0 | 1 | 2 | 4> = { cash: 0, transfer: 1, card: 2, other: 4 }

export function PaymentMix({ methods }: { methods: SalesAnalytics["paymentMethods"] }) {
  const format = useOrgFormat()
  const theme = useChartTheme()
  const total = methods.reduce((sum, method) => sum + method.total, 0)

  const config = useMemo<ChartSpec<"doughnut">>(
    () => ({
      type: "doughnut",
      data: {
        labels: methods.map((method) => PAYMENT_METHOD_LABELS[method.method]),
        datasets: [
          {
            data: methods.map((method) => method.total),
            backgroundColor: methods.map((method) => theme.series[SERIES_INDEX[method.method]]),
            borderWidth: 0,
            borderRadius: 6,
            spacing: 3,
          },
        ],
      },
      options: {
        cutout: "72%",
        plugins: { legend: { display: false }, tooltip: tooltipStyle(theme, format.money) },
      },
    }),
    [methods, theme, format],
  )

  if (total <= 0) return <p className="text-sm text-muted-foreground">Sin pagos recibidos en este periodo.</p>

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-32 shrink-0">
        <ChartCanvas config={config} label="Dinero recibido por medio de pago" className="size-full" />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted-foreground">Total</span>
          <span className="text-sm font-semibold tabular-nums">{format.compact(total)}</span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
        {methods.map((method) => (
          <li key={method.method} className="flex items-start gap-2">
            <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--chart-${SERIES_INDEX[method.method] + 1})` }} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {PAYMENT_METHOD_LABELS[method.method]} · {format.percent(method.total / total)}
              </p>
              <p className="truncate text-xs text-muted-foreground tabular-nums">
                {format.money(method.total)} · {method.salesCount} {method.salesCount === 1 ? "pago" : "pagos"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
