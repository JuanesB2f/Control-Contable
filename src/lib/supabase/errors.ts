import * as Sentry from "@sentry/nextjs"
import type { PostgrestError } from "@supabase/supabase-js"

import { fail, type ActionErrorCode } from "@/lib/action-result"

/** Stable hints raised by our database functions (see supabase/migrations). */
const businessHintMessages: Record<string, { code: ActionErrorCode; message: string }> = {
  organization_limit: { code: "rate_limited", message: "Alcanzaste el límite de negocios que puedes crear." },
  invalid_timezone: { code: "business_rule", message: "La zona horaria no es válida." },
  invalid_role: { code: "business_rule", message: "Ese rol no se puede asignar." },
  invalid_email: { code: "business_rule", message: "El correo no es válido." },
  already_member: { code: "conflict", message: "Esa persona ya es miembro de tu equipo." },
  invalid_name: { code: "validation", message: "Escribe el nombre de la persona." },
  weak_password: { code: "validation", message: "La contraseña debe tener al menos 8 caracteres, una letra y un número." },
  accounts_rate_limited: { code: "rate_limited", message: "Creaste muchas cuentas seguidas. Intenta de nuevo en una hora." },
  rate_limited: { code: "rate_limited", message: "Enviaste demasiadas invitaciones. Intenta de nuevo en una hora." },
  invitation_not_found: { code: "not_found", message: "Esta invitación no existe o fue revocada." },
  invitation_used: { code: "conflict", message: "Esta invitación ya fue utilizada." },
  invitation_expired: { code: "business_rule", message: "Esta invitación expiró. Pide una nueva." },
  invitation_email_mismatch: {
    code: "forbidden",
    message: "Esta invitación fue enviada a otro correo. Inicia sesión con la cuenta invitada.",
  },
  cannot_change_self: { code: "business_rule", message: "No puedes modificar tu propio acceso." },
  cannot_change_owner: { code: "forbidden", message: "El propietario del negocio no se puede modificar." },
  member_not_found: { code: "not_found", message: "Ese miembro ya no pertenece al equipo." },
  product_not_found: { code: "not_found", message: "Ese producto no existe o está desactivado." },
  customer_not_found: { code: "not_found", message: "Ese cliente ya no existe." },
  sale_not_found: { code: "not_found", message: "Esa venta no existe." },
  empty_sale: { code: "validation", message: "Agrega al menos un producto a la venta." },
  invalid_sale_item: { code: "validation", message: "Revisa las cantidades y precios de la venta." },
  invalid_discount: { code: "validation", message: "El descuento no puede ser mayor que el subtotal." },
  invalid_quantity: { code: "validation", message: "La cantidad no es válida." },
  invalid_movement: { code: "validation", message: "Revisa la cantidad y el costo del movimiento." },
  invalid_image: { code: "validation", message: "La foto no corresponde a ese producto." },
  invalid_payment: { code: "validation", message: "Revisa el valor del pago." },
  payment_exceeds_balance: { code: "business_rule", message: "El abono es mayor que lo que falta por pagar." },
  credit_requires_customer: { code: "business_rule", message: "Elige el cliente para dejarle el saldo pendiente." },
  bank_required: { code: "validation", message: "Elige el banco de la transferencia." },
  sale_voided: { code: "business_rule", message: "Esa venta está anulada y no recibe pagos." },
  payment_not_found: { code: "not_found", message: "Ese pago no existe." },
  receipt_exists: { code: "conflict", message: "Ese pago ya tiene comprobante." },
  invalid_receipt: { code: "validation", message: "El comprobante no corresponde a esa venta." },
  invalid_due_date: { code: "validation", message: "La fecha de pago no puede ser anterior a hoy." },
  sale_settled: { code: "business_rule", message: "Esa venta ya no tiene saldo pendiente." },
}

/** Stock errors name the product (sent in DETAIL) so the user knows which line to fix. */
function insufficientStockMessage(error: PostgrestError) {
  return error.hint === "insufficient_stock"
    ? fail("business_rule", `No hay suficientes unidades de ${error.details || "un producto"}.`)
    : null
}

export function isUniqueViolation(error: PostgrestError) {
  return error.code === "23505"
}

export function mapDatabaseError(error: PostgrestError) {
  const stockError = insufficientStockMessage(error)
  if (stockError) return stockError
  if (error.hint && businessHintMessages[error.hint]) {
    const { code, message } = businessHintMessages[error.hint]
    return fail(code, message)
  }
  if (error.code === "42501") {
    return fail("forbidden", "No tienes permiso para realizar esta acción.")
  }
  if (error.code === "28000") {
    return fail("unauthenticated", "Tu sesión expiró. Vuelve a iniciar sesión.")
  }
  if (error.code === "23514" || error.code === "22023") {
    return fail("validation", "Algunos datos no son válidos.")
  }
  Sentry.captureMessage(`[database] ${error.code}: ${error.message}`, "error")
  return fail("unexpected", "Algo salió mal. Intenta de nuevo.")
}
