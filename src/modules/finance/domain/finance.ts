import { z } from "zod"

import type { Enums } from "@/types/database"
import { amountSchema } from "@/modules/products/domain/schemas"

export const EXPENSE_CATEGORIES = [
  "rent",
  "payroll",
  "utilities",
  "marketing",
  "transport",
  "supplies",
  "taxes",
  "other",
] as const satisfies readonly Enums<"expense_category">[]

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Arriendo",
  payroll: "Nómina",
  utilities: "Servicios públicos",
  marketing: "Publicidad",
  transport: "Transporte y envíos",
  supplies: "Insumos y papelería",
  taxes: "Impuestos",
  other: "Otros",
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, "Elige una categoría."),
  description: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(160, "Máximo 160 caracteres."),
  amount: amountSchema("Escribe el valor.").refine((value) => value > 0, "El valor debe ser mayor que cero."),
  spentOn: z.string().regex(DATE_PATTERN, "Elige una fecha."),
})

export type ExpenseInput = z.input<typeof expenseSchema>

export type Expense = {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  spentOn: string
  createdAt: string
}

export type FinanceSummary = {
  revenue: number
  discounts: number
  cogs: number
  /** Payments received in the period, installments on older sales included. */
  collected: number
  /** Balances customers still owe today, regardless of the period. */
  receivable: number
  expenses: number
  purchases: number
  expensesByCategory: { category: ExpenseCategory; total: number }[]
  series: { key: string; revenue: number; cogs: number; expenses: number }[]
}

/** Income statement: what you sold, what it cost you, and what's left after running the business. */
export function profitAndLoss(summary: Pick<FinanceSummary, "revenue" | "cogs" | "expenses">) {
  const grossProfit = summary.revenue - summary.cogs
  const netProfit = grossProfit - summary.expenses
  return {
    revenue: summary.revenue,
    cogs: summary.cogs,
    grossProfit,
    expenses: summary.expenses,
    netProfit,
    grossMargin: summary.revenue > 0 ? grossProfit / summary.revenue : null,
    netMargin: summary.revenue > 0 ? netProfit / summary.revenue : null,
  }
}

/** Sales needed for the gross profit to cover the business expenses. Null when nothing sells at a profit. */
export function breakEvenRevenue(expenses: number, grossMargin: number | null) {
  if (grossMargin === null || grossMargin <= 0) return null
  return expenses / grossMargin
}

/** Money that actually came in and went out: payments received vs inventory purchases and expenses. */
export function cashFlow(summary: Pick<FinanceSummary, "collected" | "purchases" | "expenses">) {
  const outflow = summary.purchases + summary.expenses
  return { inflow: summary.collected, outflow, net: summary.collected - outflow }
}
