import { Gem, Plus, Receipt, ShoppingBasket } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { KpiCard, TrendChip, trendFromChange } from "@/components/data/kpi-card"
import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { routes } from "@/config/routes"
import { greetingFor } from "@/lib/dates"
import { createMoneyFormatter } from "@/lib/money"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { getAnalytics } from "@/modules/analytics/application/queries"
import { InsightsStrip } from "@/modules/analytics/components/insights-strip"
import { PaymentMix } from "@/modules/analytics/components/payment-mix"
import { PeriodPicker } from "@/modules/analytics/components/period-picker"
import { RevenueChart, type RevenuePoint } from "@/modules/analytics/components/revenue-chart"
import { TopProductsCard } from "@/modules/analytics/components/top-products-card"
import { buildInsights } from "@/modules/analytics/domain/insights"
import { bucketKeys, changeRatio, fillSeries, formatBucketLabel, parsePeriod, resolvePeriod } from "@/modules/analytics/domain/period"
import { GettingStarted, type GettingStartedStep } from "@/modules/dashboard/components/getting-started"
import { LowStockCard } from "@/modules/dashboard/components/low-stock-card"
import { coverageDays } from "@/modules/inventory/domain/stock"
import { getProducts } from "@/modules/products/application/queries"

export const metadata: Metadata = { title: "Inicio" }

type DashboardPageProps = PageProps<"/[orgSlug]/dashboard">

export default function DashboardPage({ params, searchParams }: DashboardPageProps) {
  return (
    <Suspense fallback={<PageSkeleton cards={3} />}>
      <Dashboard params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Dashboard({ params, searchParams }: Pick<DashboardPageProps, "params" | "searchParams">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)
  const query = await searchParams
  const now = new Date()
  const period = resolvePeriod(parsePeriod(query.period), now)
  const { organization } = context
  const canSeeSales = can(context, "sales.read")
  const canSeeProducts = can(context, "products.read")

  const [analytics, products] = await Promise.all([
    canSeeSales ? getAnalytics(context, period) : Promise.resolve(null),
    canSeeProducts ? getProducts(context) : Promise.resolve([]),
  ])

  const format = createMoneyFormatter(organization)
  const firstName = context.user.fullName?.split(" ")[0]
  const greeting = greetingFor(now, organization.timezone)
  const hasSold = (analytics?.summary.salesCount ?? 0) > 0 || products.some((product) => product.unitsSold30d > 0)

  const steps: GettingStartedStep[] = [
    { id: "organization", title: "Crea tu negocio", description: "Tu espacio está listo y protegido.", done: true },
    {
      id: "products",
      title: "Agrega tus productos",
      description: "Precios, costos y stock para conocer tu margen real.",
      done: products.length > 0,
      href: `${routes.org.products(orgSlug)}?new=1`,
      cta: "Agregar",
    },
    {
      id: "sale",
      title: "Registra tu primera venta",
      description: "El inventario y tus números se actualizan solos.",
      done: hasSold,
      href: `${routes.org.sales(orgSlug)}?new=1`,
      cta: "Vender",
    },
  ]
  const setupDone = steps.every((step) => step.done)

  const header = (
    <PageHeader
      title={`${greeting}${firstName ? `, ${firstName}` : ""} 👋`}
      description={analytics ? `${period.label} en ${organization.name}.` : "Esto es lo que está pasando en tu negocio."}
      actions={
        analytics ? (
          <>
            <PeriodPicker basePath={routes.org.dashboard(orgSlug)} current={period.key} />
            {can(context, "sales.create") ? (
              <Button asChild className="max-sm:hidden">
                <Link href={`${routes.org.sales(orgSlug)}?new=1`}>
                  <Plus data-icon="inline-start" />
                  Nueva venta
                </Link>
              </Button>
            ) : null}
          </>
        ) : null
      }
    />
  )

  if (!analytics) {
    return (
      <PageContainer>
        {header}
        <GettingStarted steps={steps} />
      </PageContainer>
    )
  }

  const { summary, previous } = analytics
  const percent = (ratio: number) => format.percent(ratio)
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
    <PageContainer>
      {header}

      {setupDone ? null : <GettingStarted steps={steps} />}

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
          <KpiCard
            label="Unidades vendidas"
            value={<AnimatedNumber value={summary.units} kind="number" />}
            icon={ShoppingBasket}
            accent="gold"
          />
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

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <TopProductsCard products={analytics.topProducts} canSeeCosts={analytics.canSeeCosts} />
        <div className="flex flex-col gap-4 lg:gap-5">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-[15px] font-semibold">Cómo te pagan</CardTitle>
              <CardDescription>Dinero recibido por medio de pago</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMix methods={analytics.paymentMethods} />
            </CardContent>
          </Card>
          {canSeeProducts ? <LowStockCard products={products} href={routes.org.inventory(orgSlug)} /> : null}
        </div>
      </div>
    </PageContainer>
  )
}
