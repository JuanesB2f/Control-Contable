import { Banknote, CreditCard, Landmark, Wallet, type LucideIcon } from "lucide-react"

import type { PaymentMethod } from "../domain/schemas"

export const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  transfer: Landmark,
  other: Wallet,
}
