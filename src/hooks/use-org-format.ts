"use client"

import { useMemo } from "react"

import { createMoneyFormatter } from "@/lib/money"
import { useOrg } from "@/modules/access/components/org-provider"

/** Money and number formatting in the active organization's currency and locale. */
export function useOrgFormat() {
  const { organization } = useOrg()
  return useMemo(
    () => createMoneyFormatter({ currency: organization.currency, locale: organization.locale }),
    [organization.currency, organization.locale],
  )
}
