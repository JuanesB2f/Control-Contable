import { stockStatus } from "@/modules/inventory/domain/stock"
import { dueLabel, dueStatus } from "@/modules/sales/domain/due-dates"

export type NotificationTone = "danger" | "warning"

export type AppNotification = {
  /** Includes the state, so a balance that goes from "soon" to "overdue" counts as new again. */
  id: string
  kind: "receivable" | "stock"
  tone: NotificationTone
  title: string
  detail: string
  href: string
}

export type DueBalance = { saleId: string; number: number; customerName: string | null; balance: number; dueDate: string }
export type StockLevel = { productId: string; name: string; stock: number; minStock: number }

export const MAX_NOTIFICATIONS = 20

type BuildInput = {
  balances: DueBalance[]
  stock: StockLevel[]
  todayKey: string
  money: (value: number) => string
  number: (value: number) => string
  links: { sale: (saleId: string) => string; stock: string }
}

type Ranked = AppNotification & { rank: number; order: number }

/** Overdue balances first, then what blocks selling today, then what's coming up. */
const RANK = { overdue: 0, out: 1, today: 2, low: 3, soon: 4 } as const

export function buildNotifications({ balances, stock, todayKey, money, number, links }: BuildInput): AppNotification[] {
  const receivables = balances.flatMap((balance): Ranked[] => {
    const due = dueStatus(balance.dueDate, todayKey)
    if (due.status !== "overdue" && due.status !== "today" && due.status !== "soon") return []
    return [
      {
        id: `sale:${balance.saleId}:${due.status}`,
        kind: "receivable",
        tone: due.status === "soon" ? "warning" : "danger",
        title: balance.customerName
          ? `${balance.customerName} te debe ${money(balance.balance)}`
          : `La venta #${balance.number} tiene ${money(balance.balance)} pendiente`,
        detail: `${dueLabel(due)} · venta #${balance.number}`,
        href: links.sale(balance.saleId),
        rank: RANK[due.status],
        order: due.status === "overdue" ? -due.days : due.days,
      },
    ]
  })

  const products = stock.flatMap((product): Ranked[] => {
    const status = stockStatus(product.stock, product.minStock)
    if (status === "ok") return []
    return [
      {
        id: `stock:${product.productId}:${status}`,
        kind: "stock",
        tone: status === "out" ? "danger" : "warning",
        title: status === "out" ? `${product.name} se agotó` : `Quedan ${number(product.stock)} de ${product.name}`,
        detail: status === "out" ? "Registra una compra para seguir vendiéndolo" : `Tu mínimo es ${number(product.minStock)}`,
        href: links.stock,
        rank: RANK[status],
        order: product.stock,
      },
    ]
  })

  return [...receivables, ...products]
    .toSorted((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, MAX_NOTIFICATIONS)
    .map(({ id, kind, tone, title, detail, href }) => ({ id, kind, tone, title, detail, href }))
}
