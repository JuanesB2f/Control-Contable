import { Building2, CircleDollarSign, Landmark, Megaphone, PenTool, Truck, Users, Zap, type LucideIcon } from "lucide-react"

import type { ExpenseCategory } from "../domain/finance"

export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  rent: Building2,
  payroll: Users,
  utilities: Zap,
  marketing: Megaphone,
  transport: Truck,
  supplies: PenTool,
  taxes: Landmark,
  other: CircleDollarSign,
}
