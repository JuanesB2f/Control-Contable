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

function text(value: unknown) {
  return typeof value === "string" ? value : null
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
    default:
      return { summary: `${actor} realizó la acción ${entry.action}`, tone: "neutral" }
  }
}
