import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MoneyFormatter } from "@/lib/money"
import { cn } from "@/lib/utils"

import type { profitAndLoss } from "../domain/finance"

type ProfitAndLoss = ReturnType<typeof profitAndLoss>

/** Income statement told as "out of every 100 you sell": product cost, running costs and what's left. */
export function MoneyFlowCard({ pnl, format }: { pnl: ProfitAndLoss; format: MoneyFormatter }) {
  const base = Math.max(pnl.revenue, pnl.cogs + pnl.expenses, 1)
  const segments = [
    { key: "cogs", label: "Lo que te costó el producto", value: pnl.cogs, className: "bg-chart-5" },
    { key: "expenses", label: "Gastos del negocio", value: pnl.expenses, className: "bg-chart-3" },
    { key: "net", label: pnl.netProfit >= 0 ? "Te queda" : "Pérdida", value: Math.abs(pnl.netProfit), className: pnl.netProfit >= 0 ? "bg-chart-1" : "bg-destructive" },
  ]
  const per100 = (value: number) => (pnl.revenue > 0 ? format.money(Math.round((value / pnl.revenue) * 100)) : "—")

  const steps = [
    { label: "Ventas", value: pnl.revenue, sign: "" },
    { label: "Costo de lo vendido", value: pnl.cogs, sign: "−" },
    { label: "Utilidad bruta", value: pnl.grossProfit, sign: "=", margin: pnl.grossMargin, total: true },
    { label: "Gastos del negocio", value: pnl.expenses, sign: "−" },
    { label: "Utilidad neta", value: pnl.netProfit, sign: "=", margin: pnl.netMargin, total: true, highlight: true },
  ]

  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">¿A dónde va tu dinero?</CardTitle>
        <CardDescription>
          {pnl.revenue > 0
            ? `De cada ${format.money(100)} que vendes, te quedan ${per100(Math.max(pnl.netProfit, 0))} limpios.`
            : "Cuando registres ventas verás cómo se reparte cada peso."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex h-4 overflow-hidden rounded-full bg-muted" role="img" aria-label="Reparto de las ventas">
          {segments.map((segment) =>
            segment.value > 0 ? (
              <div
                key={segment.key}
                className={cn("h-full transition-[width] duration-700 first:rounded-l-full last:rounded-r-full", segment.className)}
                style={{ width: `${(segment.value / base) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <ul className="grid gap-2 sm:grid-cols-3">
          {segments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
              <span className={cn("size-2.5 shrink-0 rounded-full", segment.className)} />
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{segment.label}</p>
                <p className="text-sm font-semibold tabular-nums">
                  {per100(segment.value)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">de cada {format.money(100)}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>

        <dl className="grid gap-0.5 rounded-2xl border p-1.5 text-sm">
          {steps.map((step) => (
            <div
              key={step.label}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-3 py-2",
                step.total && "bg-muted/60 font-medium",
                step.highlight && (step.value >= 0 ? "bg-primary/8 text-primary" : "bg-destructive/8 text-destructive"),
              )}
            >
              <dt className="flex items-center gap-2">
                <span className="w-3 text-center text-muted-foreground">{step.sign}</span>
                {step.label}
                {step.margin != null ? (
                  <span className="rounded-full bg-background/80 px-1.5 py-px text-[11px] font-medium text-muted-foreground tabular-nums">
                    {format.percent(step.margin)}
                  </span>
                ) : null}
              </dt>
              <dd className="tabular-nums">{format.money(step.value)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
