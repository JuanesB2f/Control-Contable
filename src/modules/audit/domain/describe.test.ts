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

  it("describes commerce events", () => {
    expect(
      describeAuditEntry(entry({ action: "inventory.adjusted", metadata: { name: "Colágeno", quantity: -2 } }), names).summary,
    ).toBe("Ana ajustó el stock de Colágeno (−2 u.)")
    expect(
      describeAuditEntry(entry({ action: "sale.voided", metadata: { number: 12, reason: "Devolución" } }), names).summary,
    ).toBe("Ana anuló la venta #12: Devolución")
    expect(
      describeAuditEntry(entry({ action: "product.updated", metadata: { name: "Colágeno", changes: { sale_price: {} } } }), names).summary,
    ).toBe("Ana cambió el precio de Colágeno")
  })

  it("traces installments until the sale is settled", () => {
    expect(
      describeAuditEntry(entry({ action: "sale.payment_added", metadata: { number: 7, amount: 20000, balance: 30000 } }), names).summary,
    ).toBe("Ana registró un abono de $20.000 a la venta #7; quedan $30.000")
    expect(
      describeAuditEntry(entry({ action: "sale.payment_added", metadata: { number: 7, amount: 30000, balance: 0 } }), names).summary,
    ).toBe("Ana registró un abono de $30.000 y saldó la venta #7")
  })

  it("describes due date changes", () => {
    const summary = describeAuditEntry(
      entry({ action: "sale.due_date_changed", metadata: { number: 7, from: null, to: "2026-10-24" } }),
      names,
    ).summary
    expect(summary).toMatch(/^Ana fijó el 24 .+ como fecha de pago de la venta #7$/)
  })

  it("falls back gracefully for unknown actors and actions", () => {
    expect(describeAuditEntry(entry({ action: "sale.created", actorName: null }), names).summary).toBe(
      "Alguien realizó la acción sale.created",
    )
  })
})
