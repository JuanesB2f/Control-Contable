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
}

export function isUniqueViolation(error: PostgrestError) {
  return error.code === "23505"
}

export function mapDatabaseError(error: PostgrestError) {
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
