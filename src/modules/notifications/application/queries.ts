import "server-only"

import { routes } from "@/config/routes"
import { createMoneyFormatter } from "@/lib/money"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { can, type OrgContext } from "@/modules/access/application/org-context"
import { localDateKey } from "@/modules/analytics/domain/period"
import { SOON_DAYS, addDays } from "@/modules/sales/domain/due-dates"

import { buildNotifications } from "../domain/notifications"
import { listDueBalances, listStockLevels } from "../infrastructure/repository"

/** Balances to collect and products to restock, limited to what the member is allowed to see. */
export async function getNotifications(context: OrgContext) {
  const { organization } = context
  const supabase = await createSupabaseServerClient()
  const todayKey = localDateKey(new Date(), organization.timezone)
  const canSeeSales = can(context, "sales.read")
  const canSeeStock = can(context, "products.read")

  const [balances, stock] = await Promise.all([
    canSeeSales ? listDueBalances(supabase, organization.id, addDays(todayKey, SOON_DAYS)) : Promise.resolve([]),
    canSeeStock ? listStockLevels(supabase, organization.id) : Promise.resolve([]),
  ])

  const format = createMoneyFormatter(organization)
  return buildNotifications({
    balances,
    stock,
    todayKey,
    money: format.money,
    number: format.number,
    links: {
      sale: (saleId) => `${routes.org.sales(organization.slug)}?sale=${saleId}`,
      stock: can(context, "inventory.read") ? routes.org.inventory(organization.slug) : routes.org.products(organization.slug),
    },
  })
}
