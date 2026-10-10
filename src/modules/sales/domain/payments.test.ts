import { describe, expect, it } from "vitest"

import { addSalePaymentSchema, balanceDue, paymentStatus } from "./payments"
import { createSaleSchema } from "./schemas"

const SALE_ID = "7f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f"
const CUSTOMER_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
const item = { productId: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e", quantity: 1, unitPrice: 50000 }

describe("balanceDue", () => {
  it("is what's left to pay, never negative", () => {
    expect(balanceDue(50000, 20000)).toBe(30000)
    expect(balanceDue(50000, 50000)).toBe(0)
    expect(balanceDue(0.3, 0.1 + 0.2)).toBe(0)
  })
})

describe("paymentStatus", () => {
  it("tells paid, partially paid and unpaid sales apart", () => {
    expect(paymentStatus(50000, 50000)).toBe("paid")
    expect(paymentStatus(50000, 10000)).toBe("partial")
    expect(paymentStatus(50000, 0)).toBe("pending")
    expect(paymentStatus(0, 0)).toBe("paid")
  })
})

describe("addSalePaymentSchema", () => {
  it("requires the bank only for transfers", () => {
    expect(addSalePaymentSchema.safeParse({ saleId: SALE_ID, amount: 10000, method: "cash" }).success).toBe(true)
    expect(addSalePaymentSchema.safeParse({ saleId: SALE_ID, amount: 10000, method: "transfer" }).success).toBe(false)
    expect(addSalePaymentSchema.safeParse({ saleId: SALE_ID, amount: 10000, method: "transfer", bank: "Nequi" }).success).toBe(true)
  })

  it("rejects empty installments", () => {
    expect(addSalePaymentSchema.safeParse({ saleId: SALE_ID, amount: 0, method: "cash" }).success).toBe(false)
  })
})

describe("createSaleSchema payments", () => {
  const base = { paymentMethod: "cash" as const, discount: 0, items: [item] }

  it("needs a customer to leave a balance", () => {
    expect(createSaleSchema.safeParse({ ...base, paidAmount: 20000 }).success).toBe(false)
    expect(createSaleSchema.safeParse({ ...base, paidAmount: 20000, customerId: CUSTOMER_ID }).success).toBe(true)
  })

  it("needs the bank when money arrives by transfer", () => {
    const transfer = { ...base, paymentMethod: "transfer" as const }
    expect(createSaleSchema.safeParse(transfer).success).toBe(false)
    expect(createSaleSchema.safeParse({ ...transfer, bank: "Bancolombia" }).success).toBe(true)
    expect(createSaleSchema.safeParse({ ...transfer, paidAmount: 0, customerId: CUSTOMER_ID }).success).toBe(true)
  })
})
