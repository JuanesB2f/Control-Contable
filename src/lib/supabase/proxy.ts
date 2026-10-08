import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Refreshes the Supabase session cookies for the incoming request and reports
 * whether a verified user is present.
 */
export async function updateSession(request: NextRequest) {
  const env = getPublicEnv()
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
          for (const [key, value] of Object.entries(headers ?? {})) {
            response.headers.set(key, value)
          }
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()

  return { response: () => response, isAuthenticated: Boolean(data?.claims?.sub) }
}
