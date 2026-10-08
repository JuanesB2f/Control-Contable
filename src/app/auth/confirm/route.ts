import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { routes, safeRedirectPath } from "@/config/routes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"]

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as readonly string[]).includes(value)
}

/** Completes email links (sign-up confirmation, password recovery) for both token-hash and PKCE flows. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const next = safeRedirectPath(searchParams.get("next"))
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const code = searchParams.get("code")

  const supabase = await createSupabaseServerClient()
  let succeeded = false

  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    succeeded = !error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    succeeded = !error
  }

  const destination = new URL(succeeded ? next : `${routes.login}?error=link_invalid`, request.nextUrl.origin)
  return NextResponse.redirect(destination)
}
