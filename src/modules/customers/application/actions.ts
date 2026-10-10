"use server"

import { revalidatePath } from "next/cache"

import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result"
import { mapDatabaseError } from "@/lib/supabase/errors"
import { authorizeOrgAction } from "@/modules/access/application/org-context"

import { customerIdSchema, customerSchema, type CustomerInput } from "../domain/schemas"

function revalidateCustomers(orgSlug: string) {
  revalidatePath(`/${orgSlug}`, "layout")
}

export async function createCustomer(
  orgSlug: string,
  input: CustomerInput,
): Promise<ActionResult<{ id: string; name: string }>> {
  const auth = await authorizeOrgAction(orgSlug, "customers.write")
  if (!auth.ok) return auth

  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { data, error } = await auth.supabase
    .from("customers")
    .insert({
      organization_id: auth.context.organization.id,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      document: parsed.data.document ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id, name")
    .single()
  if (error) return mapDatabaseError(error)

  revalidateCustomers(orgSlug)
  return ok(data)
}

export async function updateCustomer(orgSlug: string, customerId: string, input: CustomerInput): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "customers.write")
  if (!auth.ok) return auth

  const id = customerIdSchema.safeParse(customerId)
  if (!id.success) return fail("validation", "Cliente inválido.")
  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { data, error } = await auth.supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      document: parsed.data.document ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", id.data)
    .eq("organization_id", auth.context.organization.id)
    .select("id")
  if (error) return mapDatabaseError(error)
  if (data.length === 0) return fail("not_found", "Ese cliente ya no existe.")

  revalidateCustomers(orgSlug)
  return ok()
}

export async function deleteCustomer(orgSlug: string, customerId: string): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "customers.write")
  if (!auth.ok) return auth

  const id = customerIdSchema.safeParse(customerId)
  if (!id.success) return fail("validation", "Cliente inválido.")

  const { error } = await auth.supabase
    .from("customers")
    .delete()
    .eq("id", id.data)
    .eq("organization_id", auth.context.organization.id)
  if (error) return mapDatabaseError(error)

  revalidateCustomers(orgSlug)
  return ok()
}
