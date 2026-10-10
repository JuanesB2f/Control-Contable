import "server-only"

import type { SupabaseServerClient } from "@/lib/supabase/server"

import type { StockMovementType } from "../domain/schemas"

export type StockMovement = {
  id: number
  productId: string
  productName: string
  type: StockMovementType
  quantity: number
  unitCost: number | null
  stockAfter: number
  note: string | null
  saleNumber: number | null
  actorName: string | null
  createdAt: string
}

export async function listStockMovements(
  supabase: SupabaseServerClient,
  organizationId: string,
  limit = 100,
): Promise<StockMovement[]> {
  const { data, error } = await supabase.rpc("list_stock_movements", { p_organization_id: organizationId, p_limit: limit })
  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    type: row.type,
    quantity: row.quantity,
    unitCost: row.unit_cost,
    stockAfter: row.stock_after,
    note: row.note,
    saleNumber: row.sale_number,
    actorName: row.actor_name,
    createdAt: row.created_at,
  }))
}
