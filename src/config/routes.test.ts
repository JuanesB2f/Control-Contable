import { describe, expect, it } from "vitest"

import { safeRedirectPath } from "./routes"

describe("safeRedirectPath", () => {
  it("keeps internal paths", () => {
    expect(safeRedirectPath("/tienda/dashboard")).toBe("/tienda/dashboard")
  })

  it.each([null, "", "https://evil.com", "//evil.com", "/\\evil.com"])("rejects %j", (value) => {
    expect(safeRedirectPath(value, "/")).toBe("/")
  })
})
