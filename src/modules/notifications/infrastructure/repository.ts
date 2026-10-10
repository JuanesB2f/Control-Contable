import "server-only"

import type { SupabaseServerClient } from "@/lib/supabase/server"

import type { DueBalance, StockLevel } from "../domain/notifications"

/** Open balances with a due date up to `untilKey` (inclusive). Settled sales have no due date. */
export async function listDueBalances(supabase: SupabaseServerClient, organizationId: string, untilKey: string): Promise<DueBalance[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("id, number, total, paid_total, due_date, customer:customers(name)")
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .not("due_date", "is", null)
    .lte("due_date", untilKey)
    .order("due_date")
    .limit(100)
  if (error) throw error

  return data.flatMap((row) =>
    row.due_date && row.total > row.paid_total
      ? [
          {
            saleId: row.id,
            number: row.number,
            customerName: row.customer?.name ?? null,
            balance: row.total - row.paid_total,
            dueDate: row.due_date,
          },
        ]
      : [],
  )
}

export async function listStockLevels(supabase: SupabaseServerClient, organizationId: string): Promise<StockLevel[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock, min_stock")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("stock")
    .limit(500)
  if (error) throw error

  return data.map((row) => ({ productId: row.id, name: row.name, stock: row.stock, minStock: row.min_stock }))
}
