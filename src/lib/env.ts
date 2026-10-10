import { z } from "zod"

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
})

const serverEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>

let publicEnv: PublicEnv | undefined
let serverEnv: ServerEnv | undefined

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ")
}

// NEXT_PUBLIC_* variables must be referenced literally so Next.js can inline them.
export function getPublicEnv(): PublicEnv {
  if (publicEnv) return publicEnv
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  })
  if (!parsed.success) {
    throw new Error(
      `Variables de entorno públicas inválidas: ${formatIssues(parsed.error)}. ` +
        "Completa .env.local (usa .env.example como guía) y reinicia `npm run dev`.",
    )
  }
  publicEnv = parsed.data
  return publicEnv
}

export function getServerEnv(): ServerEnv {
  if (serverEnv) return serverEnv
  const parsed = serverEnvSchema.safeParse({
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  })
  if (!parsed.success) {
    throw new Error(`Variables de entorno de servidor inválidas: ${formatIssues(parsed.error)}`)
  }
  serverEnv = parsed.data
  return serverEnv
}
