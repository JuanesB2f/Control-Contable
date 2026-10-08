import type { z } from "zod"

export type ActionErrorCode =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "business_rule"
  | "unexpected"

export type ActionError = {
  code: ActionErrorCode
  message: string
  fieldErrors?: Partial<Record<string, string>>
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ActionError }

export function ok(): ActionResult<undefined>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data }
}

export function fail(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: ActionError["fieldErrors"],
): { ok: false; error: ActionError } {
  return { ok: false, error: { code, message, fieldErrors } }
}

export function failValidation(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".")
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fail("validation", "Revisa los campos marcados.", fieldErrors)
}
