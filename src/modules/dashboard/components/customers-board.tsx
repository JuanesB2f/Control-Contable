import { HeartHandshake, Repeat, UserRoundX, Users } from "lucide-react"
import Link from "next/link"

import { KpiCard } from "@/components/data/kpi-card"
import { Meter } from "@/components/data/meter"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { routes } from "@/config/routes"
import { createMoneyFormatter } from "@/lib/money"
import type { OrgContext } from "@/modules/access/application/org-context"
import { getCustomers } from "@/modules/customers/application/queries"
import { CUSTOMER_SEGMENTS, SEGMENT_INFO, championThreshold, segmentCustomer } from "@/modules/customers/domain/segments"

/** Who buys from you: repeat rate, value per buyer and who is drifting away. */
export async function CustomersBoard({ context }: { context: OrgContext }) {
  const customers = await getCustomers(context)
  const { organization } = context
  const format = createMoneyFormatter(organization)
  const now = new Date()
  const threshold = championThreshold(customers.map((customer) => customer.totalSpent))
  const segments = customers.map((customer) => segmentCustomer(customer, now, threshold))

  const buyers = customers.filter((customer) => customer.orders > 0)
  const repeatRate = buyers.length ? buyers.filter((customer) => customer.orders > 1).length / buyers.length : null
  const averageValue = buyers.length ? buyers.reduce((sum, customer) => sum + customer.totalSpent, 0) / buyers.length : 0
  const atRisk = segments.filter((segment) => segment === "at_risk").length
  const bySegment = CUSTOMER_SEGMENTS.map((segment) => ({ segment, count: segments.filter((item) => item === segment).length })).filter(
    (row) => row.count > 0,
  )

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          label="Clientes"
          value={<AnimatedNumber value={customers.length} kind="number" />}
          icon={Users}
          hint={`${format.number(buyers.length)} ya compraron`}
        />
        <KpiCard
          label="Vuelven a comprar"
          value={repeatRate === null ? "—" : format.percent(repeatRate)}
          icon={Repeat}
          accent="gold"
          hint="Compraron más de una vez"
        />
        <KpiCard
          label="Valor por cliente"
          value={<AnimatedNumber value={averageValue} kind="money" />}
          icon={HeartHandshake}
          accent="neutral"
          hint="Lo que te deja cada comprador"
        />
        <KpiCard
          label="Por recuperar"
          value={<AnimatedNumber value={atRisk} kind="number" />}
          icon={UserRoundX}
          accent={atRisk > 0 ? "gold" : "neutral"}
          hint={atRisk > 0 ? "Más de 60 días sin comprar" : "Nadie se te está yendo"}
        />
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Tus clientes por tipo</CardTitle>
          <CardDescription>Según cuánto y cada cuánto te compran</CardDescription>
          <CardAction>
            <Link href={routes.org.customers(organization.slug)} className="text-[13px] font-medium text-primary hover:underline">
              Clientes
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {bySegment.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cuando registres clientes verás aquí cómo se reparten.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {bySegment.map(({ segment, count }) => (
                <li key={segment} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{SEGMENT_INFO[segment].label}</span>
                      <span className="ml-2 text-xs text-muted-foreground max-sm:hidden">{SEGMENT_INFO[segment].description}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{format.number(count)}</span>
                  </div>
                  <Meter
                    value={count / customers.length}
                    tone={segment === "at_risk" ? "warning" : "success"}
                    label={SEGMENT_INFO[segment].label}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
