import { ArrowDownLeft, ArrowUpRight, Coins, Gem, HandCoins, Scale, Target, Wallet } from "lucide-react"
import Link from "next/link"

import { KpiCard } from "@/components/data/kpi-card"
import { Meter } from "@/components/data/meter"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { routes } from "@/config/routes"
import { createMoneyFormatter } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { OrgContext } from "@/modules/access/application/org-context"
import { bucketKeys, fillSeries, formatBucketLabel, type ResolvedPeriod } from "@/modules/analytics/domain/period"
import { getFinanceReport } from "@/modules/finance/application/queries"
import { EXPENSE_CATEGORY_ICONS } from "@/modules/finance/components/expense-icons"
import { FinanceChart, type FinancePoint } from "@/modules/finance/components/finance-chart"
import { MoneyFlowCard } from "@/modules/finance/components/money-flow-card"
import { EXPENSE_CATEGORY_LABELS, breakEvenRevenue, cashFlow, profitAndLoss } from "@/modules/finance/domain/finance"

/** What you sold, what it cost and what's really left, plus the cash that actually moved. */
export async function FinanceBoard({ context, period }: { context: OrgContext; period: ResolvedPeriod }) {
  const summary = await getFinanceReport(context, period)
  const { organization } = context
  const format = createMoneyFormatter(organization)
  const pnl = profitAndLoss(summary)
  const cash = cashFlow(summary)
  const breakEven = breakEvenRevenue(summary.expenses, pnl.grossMargin)
  const chartData: FinancePoint[] = fillSeries(
    bucketKeys(period, organization.timezone),
    summary.series.map((point) => ({ ...point, label: "", net: point.revenue - point.cogs - point.expenses })),
    (key) => ({ key, label: "", revenue: 0, cogs: 0, expenses: 0, net: 0 }),
  ).map((point) => ({ ...point, label: formatBucketLabel(point.key, period.bucket, organization.locale) }))
  const hasActivity = summary.revenue > 0 || summary.expenses > 0 || summary.purchases > 0

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          label="Ventas"
          value={<AnimatedNumber value={summary.revenue} kind="money" />}
          icon={Coins}
          hint={summary.discounts > 0 ? `${format.money(summary.discounts)} en descuentos` : "Netas de descuentos"}
        />
        <KpiCard
          label="Utilidad bruta"
          value={<AnimatedNumber value={pnl.grossProfit} kind="money" />}
          icon={Gem}
          accent="gold"
          hint={pnl.grossMargin !== null ? `Margen ${format.percent(pnl.grossMargin)}` : "Ventas − costo"}
        />
        <KpiCard label="Gastos" value={<AnimatedNumber value={summary.expenses} kind="money" />} icon={Wallet} accent="neutral" hint="Para operar el negocio" />
        <KpiCard
          label="Utilidad neta"
          value={<AnimatedNumber value={pnl.netProfit} kind="money" />}
          icon={Scale}
          accent={pnl.netProfit >= 0 ? "primary" : "neutral"}
          hint={pnl.netMargin !== null ? `Margen neto ${format.percent(pnl.netMargin)}` : "Lo que te queda"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MoneyFlowCard pnl={pnl} format={format} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-[15px] font-semibold">Flujo de caja</CardTitle>
              <CardDescription>Dinero que entró y salió de verdad.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <FlowRow
                icon={ArrowDownLeft}
                label="Entró por ventas y abonos"
                value={format.money(cash.inflow)}
                tone="in"
                hint={summary.collected !== summary.revenue ? `Vendiste ${format.money(summary.revenue)} en el periodo` : undefined}
              />
              <FlowRow
                icon={ArrowUpRight}
                label="Salió en compras y gastos"
                value={format.money(cash.outflow)}
                tone="out"
                hint={`${format.money(summary.purchases)} en mercancía · ${format.money(summary.expenses)} en gastos`}
              />
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm font-medium">Saldo del periodo</span>
                <span className={cn("text-lg font-semibold tabular-nums", cash.net >= 0 ? "text-success" : "text-destructive")}>
                  {format.money(cash.net)}
                </span>
              </div>
              {summary.receivable > 0 ? (
                <Link
                  href={routes.org.sales(organization.slug)}
                  className="flex items-center gap-3 rounded-xl bg-warning/10 p-3 transition-colors hover:bg-warning/15"
                >
                  <HandCoins className="size-4 shrink-0 text-warning" />
                  <span className="min-w-0 flex-1 text-xs text-pretty">
                    Tus clientes te deben <span className="font-semibold tabular-nums">{format.money(summary.receivable)}</span>. Míralo en
                    Ventas › Por cobrar.
                  </span>
                </Link>
              ) : null}
              {summary.purchases > 0 ? (
                <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground text-pretty">
                  La mercancía que compras no es gasto: queda en tus estantes y se vuelve costo cuando la vendes.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                <Target className="size-4 text-primary" />
                Punto de equilibrio
              </CardTitle>
              <CardDescription>
                {breakEven === null
                  ? "Cuando vendas con ganancia te diremos cuánto necesitas vender para cubrir tus gastos."
                  : summary.expenses === 0
                    ? "Sin gastos registrados: todo lo que ganas en cada venta es utilidad."
                    : `Necesitas vender ${format.money(breakEven)} para cubrir tus gastos.`}
              </CardDescription>
            </CardHeader>
            {breakEven !== null && summary.expenses > 0 ? (
              <CardContent className="flex flex-col gap-2">
                <Meter value={summary.revenue / breakEven} tone={summary.revenue >= breakEven ? "success" : "warning"} label="Avance al punto de equilibrio" className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {summary.revenue >= breakEven
                    ? `Lo superaste por ${format.money(summary.revenue - breakEven)}. Desde ahí todo es ganancia.`
                    : `Te faltan ${format.money(breakEven - summary.revenue)} en ventas.`}
                </p>
              </CardContent>
            ) : null}
          </Card>
        </div>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Ventas, costos y lo que queda</CardTitle>
          <CardDescription>{period.bucket === "month" ? "Mes a mes" : "Día a día"}</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {hasActivity ? (
            <FinanceChart data={chartData} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Aún no hay movimientos en este periodo.</p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Gastos por categoría</CardTitle>
          <CardDescription>En qué se va el dinero de operar.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.expensesByCategory.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin gastos en este periodo.</p>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2 lg:gap-x-8">
              {summary.expensesByCategory.map((row) => {
                const Icon = EXPENSE_CATEGORY_ICONS[row.category]
                const share = summary.expenses > 0 ? row.total / summary.expenses : 0
                return (
                  <li key={row.category} className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">{EXPENSE_CATEGORY_LABELS[row.category]}</span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {format.money(row.total)}
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{format.percent(share)}</span>
                        </span>
                      </div>
                      <Meter value={share} label={EXPENSE_CATEGORY_LABELS[row.category]} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function FlowRow({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof Coins
  label: string
  value: string
  tone: "in" | "out"
  hint?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          tone === "in" ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{label}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}
