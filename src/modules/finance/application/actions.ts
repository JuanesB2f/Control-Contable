"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result"
import { roundMoney } from "@/lib/money"
import { mapDatabaseError } from "@/lib/supabase/errors"
import { authorizeOrgAction } from "@/modules/access/application/org-context"

import { expenseSchema, type ExpenseInput } from "../domain/finance"

export async function createExpense(orgSlug: string, input: ExpenseInput): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "finance.write")
  if (!auth.ok) return auth

  const parsed = expenseSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { error } = await auth.supabase.from("expenses").insert({
    organization_id: auth.context.organization.id,
    category: parsed.data.category,
    description: parsed.data.description,
    amount: roundMoney(parsed.data.amount),
    spent_on: parsed.data.spentOn,
  })
  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok()
}

export async function deleteExpense(orgSlug: string, expenseId: string): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "finance.write")
  if (!auth.ok) return auth

  const id = z.uuid().safeParse(expenseId)
  if (!id.success) return fail("validation", "Gasto inválido.")

  const { error } = await auth.supabase
    .from("expenses")
    .delete()
    .eq("id", id.data)
    .eq("organization_id", auth.context.organization.id)
  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok()
}
