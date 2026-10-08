import { describe, expect, it } from "vitest"

import { describeAuditEntry, type AuditEntry } from "./describe"

const entry = (overrides: Partial<AuditEntry>): AuditEntry => ({
  id: 1,
  action: "organization.created",
  entityId: null,
  metadata: {},
  createdAt: "2026-10-07T12:00:00Z",
  actorName: "Ana",
  ...overrides,
})

const names = (userId: string | null) => (userId === "u-2" ? "Luis" : "un miembro")

describe("describeAuditEntry", () => {
  it("describes role changes with the subject name and role labels", () => {
    const result = describeAuditEntry(
      entry({ action: "member.role_changed", entityId: "u-2", metadata: { from: "employee", to: "admin" } }),
      names,
    )
    expect(result).toEqual({ summary: "Ana cambió el rol de Luis de Empleado a Administrador", tone: "neutral" })
  })

  it("lists the changed organization fields", () => {
    const result = describeAuditEntry(
      entry({ action: "organization.updated", metadata: { changes: { name: {}, currency: {} } } }),
      names,
    )
    expect(result.summary).toBe("Ana actualizó nombre, moneda del negocio")
  })

  it("flags removals as warnings", () => {
    expect(describeAuditEntry(entry({ action: "member.removed", entityId: "u-2" }), names).tone).toBe("warning")
  })

  it("falls back gracefully for unknown actors and actions", () => {
    expect(describeAuditEntry(entry({ action: "sale.created", actorName: null }), names).summary).toBe(
      "Alguien realizó la acción sale.created",
    )
  })
})
