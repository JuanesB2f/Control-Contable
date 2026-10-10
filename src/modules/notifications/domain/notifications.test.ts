import { describe, expect, it } from "vitest"

import { MAX_NOTIFICATIONS, buildNotifications, type DueBalance, type StockLevel } from "./notifications"

const today = "2026-10-09"
const money = (value: number) => `$${value}`
const number = (value: number) => String(value)
const links = { sale: (saleId: string) => `/shop/sales?sale=${saleId}`, stock: "/shop/inventory" }

const balance = (overrides: Partial<DueBalance>): DueBalance => ({
  saleId: "s1",
  number: 1,
  customerName: "María",
  balance: 50000,
  dueDate: today,
  ...overrides,
})

const product = (overrides: Partial<StockLevel>): StockLevel => ({ productId: "p1", name: "Colágeno", stock: 10, minStock: 3, ...overrides })

const build = (balances: DueBalance[], stock: StockLevel[] = []) => buildNotifications({ balances, stock, todayKey: today, money, number, links })

describe("buildNotifications", () => {
  it("describes balances that are overdue, due today or due soon, and skips later ones", () => {
    const result = build([
      balance({ saleId: "late", number: 7, dueDate: "2026-10-06" }),
      balance({ saleId: "now", number: 8, customerName: null }),
      balance({ saleId: "soon", number: 9, dueDate: "2026-10-11" }),
      balance({ saleId: "later", number: 10, dueDate: "2026-10-30" }),
    ])

    expect(result.map((item) => item.id)).toEqual(["sale:late:overdue", "sale:now:today", "sale:soon:soon"])
    expect(result[0]).toMatchObject({
      title: "María te debe $50000",
      detail: "Vencida hace 3 días · venta #7",
      tone: "danger",
      href: "/shop/sales?sale=late",
    })
    expect(result[1]?.title).toBe("La venta #8 tiene $50000 pendiente")
    expect(result[2]?.tone).toBe("warning")
  })

  it("flags products that ran out or reached their minimum", () => {
    const result = build([], [product({ productId: "a", stock: 0 }), product({ productId: "b", name: "Omega", stock: 2 }), product({ productId: "c" })])

    expect(result.map((item) => item.id)).toEqual(["stock:a:out", "stock:b:low"])
    expect(result[0]).toMatchObject({ title: "Colágeno se agotó", tone: "danger", href: "/shop/inventory" })
    expect(result[1]).toMatchObject({ title: "Quedan 2 de Omega", detail: "Tu mínimo es 3", tone: "warning" })
  })

  it("puts the most urgent first: longest overdue, out of stock, due today, low stock, due soon", () => {
    const result = build(
      [
        balance({ saleId: "soon", dueDate: "2026-10-10" }),
        balance({ saleId: "today" }),
        balance({ saleId: "late1", dueDate: "2026-10-08" }),
        balance({ saleId: "late5", dueDate: "2026-10-04" }),
      ],
      [product({ productId: "low", stock: 1 }), product({ productId: "out", stock: 0 })],
    )

    expect(result.map((item) => item.id)).toEqual([
      "sale:late5:overdue",
      "sale:late1:overdue",
      "stock:out:out",
      "sale:today:today",
      "stock:low:low",
      "sale:soon:soon",
    ])
  })

  it("caps the list", () => {
    const many = Array.from({ length: MAX_NOTIFICATIONS + 5 }, (_, index) => product({ productId: `p${index}`, stock: 0 }))
    expect(build([], many)).toHaveLength(MAX_NOTIFICATIONS)
  })
})
