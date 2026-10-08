"use server"

import { redirect } from "next/navigation"

import { routes, safeRedirectPath } from "@/config/routes"
import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result"
import { getPublicEnv } from "@/lib/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"

import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
  type ForgotPasswordInput,
  type SignInInput,
  type SignUpInput,
  type UpdatePasswordInput,
} from "../domain/schemas"

function confirmUrl(next: string) {
  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv()
  return `${NEXT_PUBLIC_SITE_URL}${routes.authConfirm}?next=${encodeURIComponent(next)}`
}

export async function signIn(input: SignInInput, next?: string): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("business_rule", "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.")
    }
    if (error.status === 429) {
      return fail("rate_limited", "Demasiados intentos. Espera unos minutos e intenta de nuevo.")
    }
    return fail("unauthenticated", "Correo o contraseña incorrectos.")
  }

  redirect(safeRedirectPath(next))
}

export async function signUp(input: SignUpInput): Promise<ActionResult<{ email: string }>> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: confirmUrl(routes.onboarding),
    },
  })

  if (error) {
    if (error.code === "weak_password") {
      return fail("validation", "Esa contraseña es muy débil.", { password: "Elige una contraseña más segura." })
    }
    if (error.status === 429) {
      return fail("rate_limited", "Demasiados intentos. Espera unos minutos e intenta de nuevo.")
    }
    return fail("unexpected", "No pudimos crear tu cuenta. Intenta de nuevo.")
  }

  // Without email confirmation Supabase returns a session right away.
  if (data.session) redirect(routes.onboarding)

  return ok({ email: parsed.data.email })
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(routes.resetPassword),
  })

  if (error?.status === 429) {
    return fail("rate_limited", "Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.")
  }
  // Same response whether or not the account exists, to avoid account enumeration.
  return ok()
}

export async function updatePassword(input: UpdatePasswordInput): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const supabase = await createSupabaseServerClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) return fail("unauthenticated", "Tu sesión expiró. Solicita un nuevo enlace.")

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    if (error.code === "same_password") {
      return fail("validation", "Usa una contraseña diferente a la anterior.", {
        password: "Debe ser distinta a la actual.",
      })
    }
    if (error.code === "weak_password") {
      return fail("validation", "Esa contraseña es muy débil.", { password: "Elige una contraseña más segura." })
    }
    return fail("unexpected", "No pudimos actualizar tu contraseña. Intenta de nuevo.")
  }
  return ok()
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect(routes.login)
}
