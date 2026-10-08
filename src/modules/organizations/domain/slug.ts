// Keep in sync with the `organizations.slug` check constraint (the database is authoritative).
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "api",
  "app",
  "auth",
  "login",
  "signup",
  "logout",
  "onboarding",
  "invite",
  "forgot-password",
  "reset-password",
  "settings",
  "account",
  "admin",
  "www",
  "static",
  "public",
  "assets",
  "help",
  "support",
  "billing",
  "monitoring",
])

export const SLUG_MIN_LENGTH = 3
export const SLUG_MAX_LENGTH = 48
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.has(slug) || slug.startsWith("_")
}

/** Builds a URL-safe slug from a business name: "Café Ñandú & Cía" → "cafe-nandu-cia". */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "")
}
