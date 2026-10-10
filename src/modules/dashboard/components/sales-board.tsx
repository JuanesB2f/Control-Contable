import { Coins, Gem, Receipt, ShoppingBasket } from "lucide-react"

import { KpiCard, trendFromChange } from "@/components/data/kpi-card"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createMoneyFormatter } from "@/lib/money"
import type { OrgContext } from "@/modules/access/application/org-context"
import { getAnalytics } from "@/modules/analytics/application/queries"
import { PaymentMix } from "@/modules/analytics/components/payment-mix"
import { TopProductsCard } from "@/modules/analytics/components/top-products-card"
import { changeRatio, type ResolvedPeriod } from "@/modules/analytics/domain/period"

/** Sales numbers for the period: how much, how many, the average ticket and what sells best. */
export async function SalesBoard({ context, period }: { context: OrgContext; period: ResolvedPeriod }) {
  const analytics = await getAnalytics(context, period)
  const format = createMoneyFormatter(context.organization)
  const percent = (ratio: number) => format.percent(ratio)
  const { summary, previous } = analytics
  const averageTicket = summary.salesCount > 0 ? summary.revenue / summary.salesCount : 0
  const previousTicket = previous.salesCount > 0 ? previous.revenue / previous.salesCount : 0

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          label="Vendido"
          value={<AnimatedNumber value={summary.revenue} kind="money" />}
          icon={Coins}
          trend={trendFromChange(changeRatio(summary.revenue, previous.revenue), percent)}
          hint="vs. periodo anterior"
        />
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
          <KpiCard label="Unidades" value={<AnimatedNumber value={summary.units} kind="number" />} icon={ShoppingBasket} accent="gold" />
        )}
        <KpiCard
          label="Ventas"
          value={<AnimatedNumber value={summary.salesCount} kind="number" />}
          icon={Receipt}
          accent="neutral"
          trend={trendFromChange(changeRatio(summary.salesCount, previous.salesCount), percent)}
        />
        <KpiCard
          label="Ticket promedio"
          value={<AnimatedNumber value={averageTicket} kind="money" />}
          icon={ShoppingBasket}
          accent="neutral"
          trend={trendFromChange(changeRatio(averageTicket, previousTicket), percent)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <TopProductsCard products={analytics.topProducts} canSeeCosts={analytics.canSeeCosts} />
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Cómo te pagan</CardTitle>
            <CardDescription>Dinero recibido por medio de pago</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentMix methods={analytics.paymentMethods} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
