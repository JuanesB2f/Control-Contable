"use server"

import { revalidatePath } from "next/cache"

import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result"
import { roundMoney } from "@/lib/money"
import { mapDatabaseError } from "@/lib/supabase/errors"
import { authorizeOrgAction } from "@/modules/access/application/org-context"

import { adjustmentSchema, purchaseSchema, type AdjustmentInput, type PurchaseInput } from "../domain/schemas"

export async function recordPurchase(orgSlug: string, input: PurchaseInput): Promise<ActionResult<{ stock: number }>> {
  const auth = await authorizeOrgAction(orgSlug, "inventory.adjust")
  if (!auth.ok) return auth

  const parsed = purchaseSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { data, error } = await auth.supabase.rpc("record_stock_movement", {
    p_product_id: parsed.data.productId,
    p_type: "purchase",
    p_quantity: parsed.data.quantity,
    p_unit_cost: roundMoney(parsed.data.unitCost),
    p_note: parsed.data.note ?? "",
  })
  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok({ stock: data })
}

export async function adjustStock(orgSlug: string, input: AdjustmentInput): Promise<ActionResult<{ stock: number }>> {
  const auth = await authorizeOrgAction(orgSlug, "inventory.adjust")
  if (!auth.ok) return auth

  const parsed = adjustmentSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { data: product, error: readError } = await auth.supabase
    .from("products")
    .select("stock")
    .eq("id", parsed.data.productId)
    .eq("organization_id", auth.context.organization.id)
    .maybeSingle()
  if (readError) return mapDatabaseError(readError)
  if (!product) return fail("not_found", "Ese producto ya no existe.")

  const difference = parsed.data.countedStock - product.stock
  if (difference === 0) {
    return fail("validation", "El conteo es igual al stock actual.", { countedStock: "El conteo es igual al stock actual." })
  }

  const { data, error } = await auth.supabase.rpc("record_stock_movement", {
    p_product_id: parsed.data.productId,
    p_type: "adjustment",
    p_quantity: difference,
    p_unit_cost: 0,
    p_note: parsed.data.note ?? "",
  })
  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok({ stock: data })
}
