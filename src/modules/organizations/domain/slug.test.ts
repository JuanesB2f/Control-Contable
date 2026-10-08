import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { createOrganizationSchema } from "./schemas"
import { RESERVED_SLUGS, isReservedSlug, slugify } from "./slug"

describe("slugify", () => {
  it("removes accents, symbols and repeated separators", () => {
    expect(slugify("Café Ñandú & Cía")).toBe("cafe-nandu-cia")
    expect(slugify("  --Tienda   Aurora!! ")).toBe("tienda-aurora")
  })

  it("never ends with a dash after truncation", () => {
    const slug = slugify(`${"a".repeat(47)} b`)
    expect(slug.length).toBeLessThanOrEqual(48)
    expect(slug.endsWith("-")).toBe(false)
  })
})

describe("reserved slugs", () => {
  it("blocks app routes and internal prefixes", () => {
    expect(isReservedSlug("login")).toBe(true)
    expect(isReservedSlug("_next")).toBe(true)
    expect(isReservedSlug("tienda-aurora")).toBe(false)
  })

  it("matches the database check constraint", () => {
    const migration = readFileSync(
      new URL("../../../../supabase/migrations/20261007000100_foundation_schema.sql", import.meta.url),
      "utf8",
    )
    const list = migration.match(/slug not in \(([^)]+)\)/)?.[1]
    expect(list).toBeDefined()
    const databaseSlugs = new Set([...(list ?? "").matchAll(/'([^']+)'/g)].map((match) => match[1]))
    expect(databaseSlugs).toEqual(new Set(RESERVED_SLUGS))
  })
})

describe("createOrganizationSchema", () => {
  const valid = { name: "Tienda Aurora", slug: "tienda-aurora", country: "CO" }

  it("accepts a valid organization", () => {
    expect(createOrganizationSchema.safeParse(valid).success).toBe(true)
  })

  it("normalizes the slug to lowercase", () => {
    expect(createOrganizationSchema.parse({ ...valid, slug: "Tienda-Aurora" }).slug).toBe("tienda-aurora")
  })

  it.each(["ab", "tienda aurora", "-tienda", "admin"])("rejects the slug %j", (slug) => {
    expect(createOrganizationSchema.safeParse({ ...valid, slug }).success).toBe(false)
  })

  it("rejects unsupported countries", () => {
    expect(createOrganizationSchema.safeParse({ ...valid, country: "XX" }).success).toBe(false)
  })
})
