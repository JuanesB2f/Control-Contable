import "server-only"

import { siteConfig } from "@/config/site"
import { escapeHtml } from "@/lib/email/send-email"

import { ROLE_LABELS, type AssignableRole } from "../domain/permissions"

type InvitationEmail = {
  organizationName: string
  inviterName: string
  role: AssignableRole
  inviteUrl: string
}

export function buildInvitationEmail({ organizationName, inviterName, role, inviteUrl }: InvitationEmail) {
  const subject = `${inviterName} te invitó a ${organizationName}`
  const roleLabel = ROLE_LABELS[role]
  const org = escapeHtml(organizationName)
  const inviter = escapeHtml(inviterName)
  const url = escapeHtml(inviteUrl)

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#1d1d1f">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;padding:40px 32px">
          <tr><td>
            <p style="margin:0 0 24px;font-size:13px;color:#6e6e73">${escapeHtml(siteConfig.name)}</p>
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;letter-spacing:-0.01em">Te invitaron a ${org}</h1>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.5;color:#424245">
              ${inviter} quiere que te unas a su equipo como <strong>${escapeHtml(roleLabel)}</strong>.
            </p>
            <a href="${url}" style="display:inline-block;background:#0071e3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:12px 22px;border-radius:999px">Aceptar invitación</a>
            <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#86868b">
              La invitación vence en 7 días. Si no esperabas este correo, puedes ignorarlo.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  const text = `${inviterName} te invitó a unirte a ${organizationName} como ${roleLabel}.\n\nAcepta la invitación aquí: ${inviteUrl}\n\nLa invitación vence en 7 días.`

  return { subject, html, text }
}
