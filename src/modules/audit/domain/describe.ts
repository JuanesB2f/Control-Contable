import { ROLE_LABELS, type AppRole } from "@/modules/access/domain/permissions"

export type AuditEntry = {
  id: number
  action: string
  entityId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  actorName: string | null
}

export type AuditTone = "neutral" | "positive" | "warning"

const ORGANIZATION_FIELD_LABELS: Record<string, string> = {
  name: "nombre",
  business_type: "tipo de negocio",
  country: "país",
  currency: "moneda",
  timezone: "zona horaria",
  locale: "formato regional",
}

const PRODUCT_FIELD_LABELS: Record<string, string> = {
  sale_price: "el precio",
  cost_price: "el costo",
  is_active: "la disponibilidad",
}

function text(value: unknown) {
  return typeof value === "string" ? value : null
}

function count(value: unknown) {
  return typeof value === "number" ? String(value) : "?"
}

function money(value: unknown) {
  return typeof value === "number" ? `$${value.toLocaleString("es-CO", { maximumFractionDigits: 2 })}` : "?"
}

function calendarDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" })
}

function signed(value: unknown) {
  if (typeof value !== "number") return "?"
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`
}

function roleLabel(value: unknown) {
  const role = text(value)
  return role && role in ROLE_LABELS ? ROLE_LABELS[role as AppRole] : "otro rol"
}

/** Human readable sentence for an audit entry. `subjectName` resolves member ids to names. */
export function describeAuditEntry(
  entry: AuditEntry,
  subjectName: (userId: string | null) => string,
): { summary: string; tone: AuditTone } {
  const actor = entry.actorName ?? "Alguien"
  const { metadata } = entry

  switch (entry.action) {
    case "organization.created":
      return { summary: `${actor} creó el negocio ${text(metadata.name) ?? ""}`.trim(), tone: "positive" }
    case "organization.updated": {
      const changes = metadata.changes
      const fields =
        changes && typeof changes === "object"
          ? Object.keys(changes).map((key) => ORGANIZATION_FIELD_LABELS[key] ?? key)
          : []
      return {
        summary: fields.length
          ? `${actor} actualizó ${fields.join(", ")} del negocio`
          : `${actor} actualizó la configuración del negocio`,
        tone: "neutral",
      }
    }
    case "member.invited":
      return {
        summary: `${actor} invitó a ${text(metadata.email) ?? "una persona"} como ${roleLabel(metadata.role)}`,
        tone: "neutral",
      }
    case "member.invitation_revoked":
      return { summary: `${actor} revocó la invitación de ${text(metadata.email) ?? "una persona"}`, tone: "warning" }
    case "member.joined":
      return { summary: `${actor} se unió al equipo como ${roleLabel(metadata.role)}`, tone: "positive" }
    case "member.role_changed":
      return {
        summary: `${actor} cambió el rol de ${subjectName(entry.entityId)} de ${roleLabel(metadata.from)} a ${roleLabel(metadata.to)}`,
        tone: "neutral",
      }
    case "member.removed":
      return { summary: `${actor} retiró a ${subjectName(entry.entityId)} del equipo`, tone: "warning" }
    case "product.created":
      return { summary: `${actor} agregó el producto ${text(metadata.name) ?? ""}`.trim(), tone: "positive" }
    case "product.updated": {
      const changes = metadata.changes && typeof metadata.changes === "object" ? Object.keys(metadata.changes) : []
      const fields = changes.map((key) => PRODUCT_FIELD_LABELS[key] ?? key)
      return {
        summary: fields.length
          ? `${actor} cambió ${fields.join(", ")} de ${text(metadata.name) ?? "un producto"}`
          : `${actor} editó ${text(metadata.name) ?? "un producto"}`,
        tone: "neutral",
      }
    }
    case "inventory.purchased":
      return {
        summary: `${actor} registró la compra de ${count(metadata.quantity)} u. de ${text(metadata.name) ?? "un producto"}`,
        tone: "positive",
      }
    case "inventory.adjusted":
      return {
        summary: `${actor} ajustó el stock de ${text(metadata.name) ?? "un producto"} (${signed(metadata.quantity)} u.)`,
        tone: "warning",
      }
    case "sale.credit_opened":
      return {
        summary: `${actor} registró la venta #${count(metadata.number)} con saldo pendiente (abonó ${money(metadata.paid)} de ${money(metadata.total)})`,
        tone: "neutral",
      }
    case "sale.payment_added":
      return {
        summary:
          metadata.balance === 0
            ? `${actor} registró un abono de ${money(metadata.amount)} y saldó la venta #${count(metadata.number)}`
            : `${actor} registró un abono de ${money(metadata.amount)} a la venta #${count(metadata.number)}; quedan ${money(metadata.balance)}`,
        tone: "positive",
      }
    case "sale.due_date_changed": {
      const to = calendarDate(metadata.to)
      return {
        summary: to
          ? `${actor} fijó el ${to} como fecha de pago de la venta #${count(metadata.number)}`
          : `${actor} quitó la fecha de pago de la venta #${count(metadata.number)}`,
        tone: "neutral",
      }
    }
    case "sale.receipt_attached":
      return {
        summary: `${actor} adjuntó el comprobante de un pago de ${money(metadata.amount)} en la venta #${count(metadata.number)}`,
        tone: "neutral",
      }
    case "sale.voided":
      return {
        summary: `${actor} anuló la venta #${count(metadata.number)}${text(metadata.reason) ? `: ${text(metadata.reason)}` : ""}`,
        tone: "warning",
      }
    default:
      return { summary: `${actor} realizó la acción ${entry.action}`, tone: "neutral" }
  }
}
