import { describe, expect, it } from "vitest"

import { emailSchema, passwordSchema, updatePasswordSchema } from "./schemas"

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  Ana@Correo.COM ")).toBe("ana@correo.com")
  })

  it("rejects invalid addresses", () => {
    expect(emailSchema.safeParse("ana@").success).toBe(false)
  })
})

describe("passwordSchema", () => {
  it.each([
    ["short1", false],
    ["solamenteletras", false],
    ["12345678", false],
    ["segura123", true],
  ])("%j → %s", (password, valid) => {
    expect(passwordSchema.safeParse(password).success).toBe(valid)
  })
})

describe("updatePasswordSchema", () => {
  it("reports mismatches on the confirmation field", () => {
    const result = updatePasswordSchema.safeParse({ password: "segura123", confirmPassword: "segura124" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"])
  })
})
