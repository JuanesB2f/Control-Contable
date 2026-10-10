export const CUSTOMER_SEGMENTS = ["champion", "loyal", "new", "at_risk", "occasional", "prospect"] as const
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number]

export const SEGMENT_INFO: Record<CustomerSegment, { label: string; description: string }> = {
  champion: { label: "Campeón", description: "Compra seguido y es de los que más gasta." },
  loyal: { label: "Frecuente", description: "Ya te ha comprado 3 veces o más." },
  new: { label: "Nuevo", description: "Hizo su primera compra este mes." },
  at_risk: { label: "En riesgo", description: "No compra hace más de 60 días." },
  occasional: { label: "Ocasional", description: "Compra de vez en cuando." },
  prospect: { label: "Sin compras", description: "Registrado, pero aún no ha comprado." },
}

const DAY_MS = 24 * 60 * 60 * 1000
const AT_RISK_AFTER_DAYS = 60
const NEW_WITHIN_DAYS = 30
const FREQUENT_ORDERS = 3

type CustomerActivity = {
  orders: number
  totalSpent: number
  firstPurchaseAt: string | null
  lastPurchaseAt: string | null
}

/** Spend that puts a customer in the top 20% of buyers. */
export function championThreshold(totals: number[]) {
  const buyers = totals.filter((total) => total > 0).sort((a, b) => b - a)
  if (buyers.length === 0) return Number.POSITIVE_INFINITY
  return buyers[Math.max(0, Math.ceil(buyers.length * 0.2) - 1)]
}

export function segmentCustomer(customer: CustomerActivity, now: Date, threshold: number): CustomerSegment {
  if (customer.orders === 0 || !customer.lastPurchaseAt || !customer.firstPurchaseAt) return "prospect"

  const daysSinceLast = (now.getTime() - new Date(customer.lastPurchaseAt).getTime()) / DAY_MS
  const daysSinceFirst = (now.getTime() - new Date(customer.firstPurchaseAt).getTime()) / DAY_MS

  if (daysSinceLast > AT_RISK_AFTER_DAYS) return "at_risk"
  if (customer.orders >= FREQUENT_ORDERS && customer.totalSpent >= threshold) return "champion"
  if (customer.orders >= FREQUENT_ORDERS) return "loyal"
  if (daysSinceFirst <= NEW_WITHIN_DAYS) return "new"
  return "occasional"
}
