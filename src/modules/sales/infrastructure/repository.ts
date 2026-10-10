import "server-only"

import { z } from "zod"

import type { SupabaseServerClient } from "@/lib/supabase/server"

import { PAYMENT_RECEIPT_BUCKET } from "../domain/payments"
import { PAYMENT_METHODS, type Sale } from "../domain/schemas"

/** Receipt links last long enough to browse the page, and expire soon after. */
const RECEIPT_URL_TTL_SECONDS = 60 * 60

const saleItemsSchema = z.array(
  z.object({
    product_id: z.string().nullable(),
    name: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
    line_total: z.number(),
    unit_cost: z.number().nullable(),
  }),
)

const salePaymentsSchema = z.array(
  z.object({
    id: z.string(),
    amount: z.number(),
    method: z.enum(PAYMENT_METHODS),
    bank: z.string().nullable(),
    reference: z.string().nullable(),
    note: z.string().nullable(),
    receipt_path: z.string().nullable(),
    paid_at: z.string(),
    received_by: z.string().nullable(),
  }),
)

type SalesQuery = { range: { from: Date; to: Date } } | { pendingOnly: true }

export async function listSales(supabase: SupabaseServerClient, organizationId: string, query: SalesQuery, limit = 500): Promise<Sale[]> {
  const { data, error } = await supabase.rpc(
    "list_sales",
    "range" in query
      ? { p_organization_id: organizationId, p_from: query.range.from.toISOString(), p_to: query.range.to.toISOString(), p_limit: limit }
      : { p_organization_id: organizationId, p_pending_only: true, p_limit: limit },
  )
  if (error) throw error

  const rows = data.map((row) => ({ row, payments: salePaymentsSchema.parse(row.payments) }))
  const receiptUrls = await signReceiptUrls(
    supabase,
    rows.flatMap(({ payments }) => payments.flatMap((payment) => (payment.receipt_path ? [payment.receipt_path] : []))),
  )

  return rows.map(({ row, payments }) => ({
    id: row.id,
    number: row.number,
    status: row.status,
    paymentMethod: row.payment_method,
    customerId: row.customer_id,
    customerName: row.customer_name,
    sellerName: row.seller_name,
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    paidTotal: row.paid_total,
    dueDate: row.due_date,
    profit: row.profit,
    notes: row.notes,
    soldAt: row.sold_at,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    items: saleItemsSchema.parse(row.items).map((item) => ({
      productId: item.product_id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      unitCost: item.unit_cost,
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
      bank: payment.bank,
      reference: payment.reference,
      note: payment.note,
      receiptUrl: payment.receipt_path ? (receiptUrls.get(payment.receipt_path) ?? null) : null,
      paidAt: payment.paid_at,
      receivedBy: payment.received_by,
    })),
  }))
}

async function signReceiptUrls(supabase: SupabaseServerClient, paths: string[]) {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls
  const { data, error } = await supabase.storage.from(PAYMENT_RECEIPT_BUCKET).createSignedUrls(paths, RECEIPT_URL_TTL_SECONDS)
  if (error) throw error
  for (const entry of data) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl)
  }
  return urls
}

/** The payment as the current user can see it, to check it before uploading its receipt. */
export async function findPaymentForReceipt(supabase: SupabaseServerClient, paymentId: string) {
  const { data, error } = await supabase
    .from("sale_payments")
    .select("organization_id, sale_id, receipt_path")
    .eq("id", paymentId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function uploadPaymentReceipt(supabase: SupabaseServerClient, path: string, file: Blob, contentType: string) {
  return supabase.storage.from(PAYMENT_RECEIPT_BUCKET).upload(path, file, { contentType, upsert: false })
}
