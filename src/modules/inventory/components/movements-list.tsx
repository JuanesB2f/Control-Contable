import { ArrowDownLeft, ArrowUpRight, History, PackageOpen, RotateCcw, SlidersHorizontal, type LucideIcon } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { formatDateTime } from "@/lib/dates"
import type { MoneyFormatter } from "@/lib/money"
import { cn } from "@/lib/utils"

import { STOCK_MOVEMENT_LABELS, type StockMovementType } from "../domain/schemas"
import type { StockMovement } from "../infrastructure/repository"

const TYPE_STYLE: Record<StockMovementType, { icon: LucideIcon; className: string }> = {
  opening: { icon: PackageOpen, className: "bg-muted text-muted-foreground" },
  purchase: { icon: ArrowDownLeft, className: "bg-success/12 text-success" },
  sale: { icon: ArrowUpRight, className: "bg-primary/10 text-primary" },
  adjustment: { icon: SlidersHorizontal, className: "bg-warning/15 text-warning" },
  void: { icon: RotateCcw, className: "bg-muted text-muted-foreground" },
}

type MovementsListProps = {
  movements: StockMovement[]
  timezone: string
  locale: string
  format: MoneyFormatter
}

export function MovementsList({ movements, timezone, locale, format }: MovementsListProps) {
  if (movements.length === 0) {
    return <EmptyState icon={History} title="Sin movimientos todavía" description="Compras, ventas y ajustes aparecerán aquí." />
  }

  return (
    <ul className="divide-y divide-border/70">
      {movements.map((movement) => {
        const style = TYPE_STYLE[movement.type]
        const detail = [
          movement.saleNumber ? `Venta #${movement.saleNumber}` : null,
          movement.unitCost !== null && movement.type === "purchase" ? `a ${format.money(movement.unitCost)} c/u` : null,
          movement.note,
          movement.actorName,
        ].filter(Boolean)

        return (
          <li key={movement.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", style.className)}>
              <style.icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{movement.productName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {STOCK_MOVEMENT_LABELS[movement.type]}
                {detail.length ? ` · ${detail.join(" · ")}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("text-sm font-semibold tabular-nums", movement.quantity > 0 ? "text-success" : "text-foreground")}>
                {movement.quantity > 0 ? "+" : "−"}
                {format.number(Math.abs(movement.quantity))}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(movement.createdAt, timezone, locale)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
