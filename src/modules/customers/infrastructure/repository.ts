import "server-only"

import type { SupabaseServerClient } from "@/lib/supabase/server"

import type { Customer } from "../domain/schemas"

export async function listCustomers(supabase: SupabaseServerClient, organizationId: string): Promise<Customer[]> {
  const { data, error } = await supabase.rpc("list_customers", { p_organization_id: organizationId })
  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    document: row.document,
    notes: row.notes,
    createdAt: row.created_at,
    orders: row.orders,
    totalSpent: row.total_spent,
    firstPurchaseAt: row.first_purchase_at,
    lastPurchaseAt: row.last_purchase_at,
    favoriteProduct: row.favorite_product,
    balanceDue: row.balance_due,
  }))
}
