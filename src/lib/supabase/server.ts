import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

export async function createSupabaseServerClient() {
  const env = getPublicEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components can't write cookies; the proxy refreshes the session instead.
        }
      },
    },
  })
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
