import "server-only"

import { z } from "zod"

import type { SupabaseServerClient } from "@/lib/supabase/server"
import { PAYMENT_METHODS } from "@/modules/sales/domain/schemas"

import type { SalesAnalytics } from "../domain/analytics"
import type { ResolvedPeriod } from "../domain/period"

const analyticsSchema = z.object({
  can_see_costs: z.boolean(),
  summary: z.object({
    revenue: z.number(),
    sales_count: z.number(),
    discounts: z.number(),
    customers: z.number(),
    units: z.number(),
    cost: z.number().nullable(),
    profit: z.number().nullable(),
  }),
  previous: z.object({ revenue: z.number(), sales_count: z.number(), profit: z.number().nullable() }),
  series: z.array(z.object({ key: z.string(), revenue: z.number(), profit: z.number().nullable(), sales_count: z.number() })),
  top_products: z.array(
    z.object({
      product_id: z.string().nullable(),
      name: z.string(),
      units: z.number(),
      revenue: z.number(),
      profit: z.number().nullable(),
    }),
  ),
  top_customers: z.array(
    z.object({ customer_id: z.string(), name: z.string(), orders: z.number(), total: z.number(), last_purchase_at: z.string() }),
  ),
  heatmap: z.array(z.object({ weekday: z.number(), hour: z.number(), sales_count: z.number(), revenue: z.number() })),
  payment_methods: z.array(z.object({ method: z.enum(PAYMENT_METHODS), sales_count: z.number(), total: z.number() })),
})

export async function getSalesAnalytics(
  supabase: SupabaseServerClient,
  organizationId: string,
  period: Pick<ResolvedPeriod, "from" | "to" | "bucket">,
): Promise<SalesAnalytics> {
  const { data, error } = await supabase.rpc("get_sales_analytics", {
    p_organization_id: organizationId,
    p_from: period.from.toISOString(),
    p_to: period.to.toISOString(),
    p_bucket: period.bucket,
  })
  if (error) throw error

  const raw = analyticsSchema.parse(data)
  return {
    canSeeCosts: raw.can_see_costs,
    summary: {
      revenue: raw.summary.revenue,
      salesCount: raw.summary.sales_count,
      discounts: raw.summary.discounts,
      customers: raw.summary.customers,
      units: raw.summary.units,
      cost: raw.summary.cost,
      profit: raw.summary.profit,
    },
    previous: { revenue: raw.previous.revenue, salesCount: raw.previous.sales_count, profit: raw.previous.profit },
    series: raw.series.map((row) => ({ key: row.key, revenue: row.revenue, profit: row.profit, salesCount: row.sales_count })),
    topProducts: raw.top_products.map((row) => ({
      productId: row.product_id,
      name: row.name,
      units: row.units,
      revenue: row.revenue,
      profit: row.profit,
    })),
    topCustomers: raw.top_customers.map((row) => ({
      customerId: row.customer_id,
      name: row.name,
      orders: row.orders,
      total: row.total,
      lastPurchaseAt: row.last_purchase_at,
    })),
    heatmap: raw.heatmap.map((row) => ({
      weekday: row.weekday,
      hour: row.hour,
      salesCount: row.sales_count,
      revenue: row.revenue,
    })),
    paymentMethods: raw.payment_methods.map((row) => ({ method: row.method, salesCount: row.sales_count, total: row.total })),
  }
}
