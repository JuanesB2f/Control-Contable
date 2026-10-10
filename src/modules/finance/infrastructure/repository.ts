import "server-only"

import { z } from "zod"

import type { SupabaseServerClient } from "@/lib/supabase/server"

import { EXPENSE_CATEGORIES, type Expense, type FinanceSummary } from "../domain/finance"

const financeSummarySchema = z.object({
  revenue: z.number(),
  discounts: z.number(),
  cogs: z.number(),
  collected: z.number(),
  receivable: z.number(),
  expenses: z.number(),
  purchases: z.number(),
  expenses_by_category: z.array(z.object({ category: z.enum(EXPENSE_CATEGORIES), total: z.number() })),
  series: z.array(z.object({ key: z.string(), revenue: z.number(), cogs: z.number(), expenses: z.number() })),
})

export async function getFinanceSummary(
  supabase: SupabaseServerClient,
  organizationId: string,
  range: { from: Date; to: Date; bucket: "day" | "month" },
): Promise<FinanceSummary> {
  const { data, error } = await supabase.rpc("get_finance_summary", {
    p_organization_id: organizationId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_bucket: range.bucket,
  })
  if (error) throw error

  const summary = financeSummarySchema.parse(data)
  return {
    revenue: summary.revenue,
    discounts: summary.discounts,
    cogs: summary.cogs,
    collected: summary.collected,
    receivable: summary.receivable,
    expenses: summary.expenses,
    purchases: summary.purchases,
    expensesByCategory: summary.expenses_by_category,
    series: summary.series,
  }
}

export async function listExpenses(
  supabase: SupabaseServerClient,
  organizationId: string,
  range: { fromDate: string; toDate: string },
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, category, description, amount, spent_on, created_at")
    .eq("organization_id", organizationId)
    .gte("spent_on", range.fromDate)
    .lte("spent_on", range.toDate)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    category: row.category,
    description: row.description,
    amount: row.amount,
    spentOn: row.spent_on,
    createdAt: row.created_at,
  }))
}
