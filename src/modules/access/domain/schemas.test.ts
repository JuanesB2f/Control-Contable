import { describe, expect, it } from "vitest"

import { invitationTokenSchema, inviteMemberSchema } from "./schemas"

describe("inviteMemberSchema", () => {
  it("accepts assignable roles", () => {
    expect(inviteMemberSchema.safeParse({ email: "ana@correo.com", role: "admin" }).success).toBe(true)
    expect(inviteMemberSchema.safeParse({ email: "ana@correo.com", role: "employee" }).success).toBe(true)
  })

  it("never allows inviting an owner", () => {
    expect(inviteMemberSchema.safeParse({ email: "ana@correo.com", role: "owner" }).success).toBe(false)
  })
})

describe("invitationTokenSchema", () => {
  it("only accepts 32-byte hex tokens", () => {
    expect(invitationTokenSchema.safeParse("a".repeat(64)).success).toBe(true)
    expect(invitationTokenSchema.safeParse("A".repeat(64)).success).toBe(false)
    expect(invitationTokenSchema.safeParse("a".repeat(63)).success).toBe(false)
  })
})
