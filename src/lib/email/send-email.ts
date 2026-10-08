import "server-only"

import * as Sentry from "@sentry/nextjs"
import { Resend } from "resend"

import { getServerEnv } from "@/lib/env"

type EmailMessage = {
  to: string
  subject: string
  html: string
  text: string
}

/** Sends a transactional email. Returns false when email is not configured or delivery fails. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const env = getServerEnv()
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false

  const resend = new Resend(env.RESEND_API_KEY)
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...message })
  if (error) {
    Sentry.captureMessage(`[email] ${error.name}: ${error.message}`, "warning")
    return false
  }
  return true
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
