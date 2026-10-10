"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result"
import { IMAGE_EXTENSIONS, inspectUploadedImage } from "@/lib/images"
import { roundMoney } from "@/lib/money"
import { mapDatabaseError } from "@/lib/supabase/errors"
import { authorizeOrgAction } from "@/modules/access/application/org-context"

import { addSalePaymentSchema, setDueDateSchema, type AddSalePaymentInput, type SetDueDateInput } from "../domain/payments"
import { createSaleSchema, voidSaleSchema, type CreateSaleInput, type VoidSaleInput } from "../domain/schemas"
import { findPaymentForReceipt, uploadPaymentReceipt } from "../infrastructure/repository"

export async function createSale(
  orgSlug: string,
  input: CreateSaleInput,
): Promise<ActionResult<{ id: string; number: number; paymentId: string | null }>> {
  const auth = await authorizeOrgAction(orgSlug, "sales.create")
  if (!auth.ok) return auth

  const parsed = createSaleSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { customerId, paymentMethod, discount, notes, paidAmount, bank, reference, dueDate, items } = parsed.data
  const { data, error } = await auth.supabase
    .rpc("create_sale", {
      p_organization_id: auth.context.organization.id,
      p_payment_method: paymentMethod,
      p_discount: roundMoney(discount),
      p_items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: roundMoney(item.unitPrice),
      })),
      p_customer_id: customerId,
      p_notes: notes,
      p_paid_amount: paidAmount === undefined ? undefined : roundMoney(paidAmount),
      p_bank: paymentMethod === "transfer" ? bank : undefined,
      p_reference: reference,
      p_due_date: paidAmount === undefined ? undefined : dueDate,
    })
    .single()
  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok({ id: data.sale_id, number: data.sale_number, paymentId: data.payment_id ?? null })
}

export async function addSalePayment(orgSlug: string, input: AddSalePaymentInput): Promise<ActionResult<{ paymentId: string }>> {
  const auth = await authorizeOrgAction(orgSlug, "sales.create")
  if (!auth.ok) return auth

  const parsed = addSalePaymentSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { saleId, amount, method, bank, reference, note, dueDate } = parsed.data
  const { data, error } = await auth.supabase.rpc("add_sale_payment", {
    p_sale_id: saleId,
    p_amount: roundMoney(amount),
    p_method: method,
    p_bank: method === "transfer" ? bank : undefined,
    p_reference: reference,
    p_note: note,
    p_due_date: dueDate,
  })
  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok({ paymentId: data })
}

export async function setSaleDueDate(orgSlug: string, input: SetDueDateInput): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "sales.create")
  if (!auth.ok) return auth

  const parsed = setDueDateSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { error } = await auth.supabase.rpc("set_sale_due_date", { p_sale_id: parsed.data.saleId, p_due_date: parsed.data.dueDate })
  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok()
}

/** Expects `paymentId` and `receipt` in the form data. A payment keeps the first receipt attached to it. */
export async function attachPaymentReceipt(orgSlug: string, formData: FormData): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "sales.create")
  if (!auth.ok) return auth

  const paymentId = z.uuid().safeParse(formData.get("paymentId"))
  const receipt = formData.get("receipt")
  if (!paymentId.success || !(receipt instanceof Blob)) return fail("validation", "Elige la foto del comprobante.")

  const type = await inspectUploadedImage(receipt)
  if (!type) return fail("validation", "Usa una foto JPG, PNG o WebP de menos de 900 KB.")

  const payment = await findPaymentForReceipt(auth.supabase, paymentId.data)
  if (!payment || payment.organization_id !== auth.context.organization.id) return fail("not_found", "Ese pago no existe.")
  if (payment.receipt_path) return fail("conflict", "Ese pago ya tiene comprobante.")

  const path = `${payment.organization_id}/${payment.sale_id}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[type]}`
  const upload = await uploadPaymentReceipt(auth.supabase, path, receipt, type)
  if (upload.error) return fail("forbidden", "No pudimos guardar el comprobante.")

  const { error } = await auth.supabase.rpc("set_payment_receipt", { p_payment_id: paymentId.data, p_receipt_path: path })
  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok()
}

export async function voidSale(orgSlug: string, input: VoidSaleInput): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "sales.void")
  if (!auth.ok) return auth

  const parsed = voidSaleSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const { error } = await auth.supabase.rpc("void_sale", { p_sale_id: parsed.data.saleId, p_reason: parsed.data.reason })
  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok()
}
