import { describe, expect, it } from "vitest"

import { whatsappUrl } from "./contact"

describe("whatsappUrl", () => {
  it("adds the country code to local numbers", () => {
    expect(whatsappUrl("300 123 4567", "CO")).toBe("https://wa.me/573001234567")
  })

  it("keeps numbers that already have it", () => {
    expect(whatsappUrl("+57 300 123 4567", "CO")).toBe("https://wa.me/573001234567")
    expect(whatsappUrl("573001234567", "CO")).toBe("https://wa.me/573001234567")
  })

  it("ignores missing or too short numbers", () => {
    expect(whatsappUrl(null, "CO")).toBeNull()
    expect(whatsappUrl("123", "CO")).toBeNull()
  })
})
