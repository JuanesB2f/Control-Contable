import { Gem, Receipt, ShoppingBasket } from "lucide-react"

import { KpiCard, TrendChip, trendFromChange } from "@/components/data/kpi-card"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { routes } from "@/config/routes"
import { createMoneyFormatter } from "@/lib/money"
import { can, type OrgContext } from "@/modules/access/application/org-context"
import { getAnalytics } from "@/modules/analytics/application/queries"
import { InsightsStrip } from "@/modules/analytics/components/insights-strip"
import { RevenueChart, type RevenuePoint } from "@/modules/analytics/components/revenue-chart"
import { buildInsights } from "@/modules/analytics/domain/insights"
import { bucketKeys, changeRatio, fillSeries, formatBucketLabel, type ResolvedPeriod } from "@/modules/analytics/domain/period"
import { coverageDays } from "@/modules/inventory/domain/stock"
import { getProducts } from "@/modules/products/application/queries"

import { GettingStarted, type GettingStartedStep } from "./getting-started"
import { LowStockCard } from "./low-stock-card"

/** The big picture: how much you sold, what you earned and what needs attention. */
export async function OverviewBoard({ context, period }: { context: OrgContext; period: ResolvedPeriod }) {
  const { organization } = context
  const slug = organization.slug
  const canSeeSales = can(context, "sales.read")
  const canSeeProducts = can(context, "products.read")

  const [analytics, products] = await Promise.all([
    canSeeSales ? getAnalytics(context, period) : Promise.resolve(null),
    canSeeProducts ? getProducts(context) : Promise.resolve([]),
  ])

  const hasSold = (analytics?.summary.salesCount ?? 0) > 0 || products.some((product) => product.unitsSold30d > 0)
  const steps: GettingStartedStep[] = [
    { id: "organization", title: "Crea tu negocio", description: "Tu espacio está listo y protegido.", done: true },
    {
      id: "products",
      title: "Agrega tus productos",
      description: "Precios, costos y stock para conocer tu margen real.",
      done: products.length > 0,
      href: `${routes.org.products(slug)}?new=1`,
      cta: "Agregar",
    },
    {
      id: "sale",
      title: "Registra tu primera venta",
      description: "El inventario y tus números se actualizan solos.",
      done: hasSold,
      href: `${routes.org.sales(slug)}?new=1`,
      cta: "Vender",
    },
  ]
  const gettingStarted = steps.every((step) => step.done) ? null : <GettingStarted steps={steps} />

  const lowStock = canSeeProducts ? <LowStockCard products={products} href={routes.org.inventory(slug)} /> : null

  if (!analytics) {
    return (
      <>
        {gettingStarted}
        {lowStock}
      </>
    )
  }

  const format = createMoneyFormatter(organization)
  const percent = (ratio: number) => format.percent(ratio)
  const { summary, previous } = analytics
  const runningOut = products
    .filter((product) => product.isActive)
    .map((product) => ({ name: product.name, days: coverageDays(product.stock, product.unitsSold30d) }))
    .filter((item): item is { name: string; days: number } => item.days !== null && item.days < 7)
    .toSorted((a, b) => a.days - b.days)
  const insights = buildInsights({ analytics, runningOut, format })
  const series: RevenuePoint[] = fillSeries(
    bucketKeys(period, organization.timezone),
    analytics.series.map((point) => ({ key: point.key, label: "", revenue: point.revenue, profit: point.profit })),
    (key) => ({ key, label: "", revenue: 0, profit: analytics.canSeeCosts ? 0 : null }),
  ).map((point) => ({ ...point, label: formatBucketLabel(point.key, period.bucket, organization.locale) }))
  const revenueTrend = trendFromChange(changeRatio(summary.revenue, previous.revenue), percent)

  return (
    <>
      {gettingStarted}

      <Card className="gap-3">
        <CardHeader>
          <CardDescription className="text-[13px] font-medium">Vendiste</CardDescription>
          <CardTitle className="text-[32px] leading-tight font-semibold tracking-tight tabular-nums sm:text-[40px]">
            <AnimatedNumber value={summary.revenue} kind="money" />
          </CardTitle>
          {revenueTrend ? (
            <CardAction className="flex flex-col items-end gap-1">
              <TrendChip trend={revenueTrend} />
              <span className="text-[11px] text-muted-foreground">vs. periodo anterior</span>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          <RevenueChart data={series} showProfit={analytics.canSeeCosts} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {summary.profit !== null ? (
          <KpiCard
            label="Ganancia"
            value={<AnimatedNumber value={summary.profit} kind="money" />}
            icon={Gem}
            accent="gold"
            trend={previous.profit !== null ? trendFromChange(changeRatio(summary.profit, previous.profit), percent) : undefined}
            hint={summary.revenue > 0 ? `Margen ${format.percent(summary.profit / summary.revenue)}` : undefined}
          />
        ) : (
          <KpiCard label="Unidades vendidas" value={<AnimatedNumber value={summary.units} kind="number" />} icon={ShoppingBasket} accent="gold" />
        )}
        <KpiCard
          label="Ventas"
          value={<AnimatedNumber value={summary.salesCount} kind="number" />}
          icon={Receipt}
          accent="neutral"
          trend={trendFromChange(changeRatio(summary.salesCount, previous.salesCount), percent)}
          hint={summary.salesCount > 0 ? `Ticket ${format.money(summary.revenue / summary.salesCount)}` : undefined}
        />
      </div>

      <InsightsStrip insights={insights} />

      {lowStock}
    </>
  )
}
