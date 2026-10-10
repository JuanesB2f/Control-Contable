"use client"

import { useOrgFormat } from "@/hooks/use-org-format"
import { cn } from "@/lib/utils"
import { useOrg } from "@/modules/access/components/org-provider"

import {
  MARGIN_HEALTH_LABELS,
  TARGET_MARGINS,
  marginHealth,
  marginRatio,
  markupRatio,
  priceForMargin,
  roundPriceUp,
  unitProfit,
} from "../domain/pricing"
import { MARGIN_TONE, MarginRing } from "./margin-ring"

type PriceSimulatorProps = {
  cost: number
  price: number
  onApplyPrice: (price: number) => void
}

/** Live answer to "if I buy it at X and sell it at Y, how much do I make?". */
export function PriceSimulator({ cost, price, onApplyPrice }: PriceSimulatorProps) {
  const { organization } = useOrg()
  const format = useOrgFormat()
  const ready = Number.isFinite(cost) && Number.isFinite(price) && price > 0
  const margin = ready ? marginRatio(cost, price) : 0
  const markup = ready ? markupRatio(cost, price) : null
  const health = marginHealth(margin)
  const suggestions = Number.isFinite(cost) && cost > 0
    ? TARGET_MARGINS.map((target) => {
        const suggested = priceForMargin(cost, target)
        return { target, price: suggested === null ? null : roundPriceUp(suggested, organization.currency) }
      })
    : []

  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      <div className="flex items-center gap-4">
        <MarginRing ratio={margin} label={ready ? format.percent(margin) : "—"} />
        <div className="min-w-0 space-y-1">
          <p className={cn("text-xs font-semibold tracking-wide uppercase", ready ? MARGIN_TONE[health] : "text-muted-foreground")}>
            {ready ? MARGIN_HEALTH_LABELS[health] : "Escribe costo y precio"}
          </p>
          <p className="text-[15px] leading-snug font-semibold text-pretty">
            {ready
              ? unitProfit(cost, price) >= 0
                ? `Ganas ${format.money(unitProfit(cost, price))} por unidad`
                : `Pierdes ${format.money(Math.abs(unitProfit(cost, price)))} por unidad`
              : "Te mostramos cuánto ganas por cada venta"}
          </p>
          {ready && markup !== null ? (
            <p className="text-xs text-muted-foreground">
              Le sumas un {format.percent(markup)} a lo que te costó (markup)
            </p>
          ) : null}
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Precio sugerido para ganar…</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {suggestions.map((suggestion) =>
              suggestion.price === null ? null : (
                <button
                  key={suggestion.target}
                  type="button"
                  onClick={() => onApplyPrice(suggestion.price ?? 0)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border bg-background px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary/5",
                    suggestion.price === price && "border-primary bg-primary/5 ring-1 ring-primary",
                  )}
                >
                  <span className="text-[11px] font-medium text-muted-foreground">{format.percent(suggestion.target)} margen</span>
                  <span className="text-sm font-semibold tabular-nums">{format.money(suggestion.price)}</span>
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
