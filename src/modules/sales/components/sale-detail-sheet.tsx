"use client"

import { Ban } from "lucide-react"
import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { SubmitButton } from "@/components/forms/submit-button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useOrgFormat } from "@/hooks/use-org-format"
import { formatDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"

import { voidSale } from "../application/actions"
import { balanceDue } from "../domain/payments"
import { PAYMENT_METHOD_LABELS, type Sale } from "../domain/schemas"
import { PaymentTimeline } from "./payment-timeline"

export function SaleDetailSheet({ sale, onOpenChange }: { sale: Sale | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={sale !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">{sale ? <SaleDetail sale={sale} /> : null}</SheetContent>
    </Sheet>
  )
}

function SaleDetail({ sale }: { sale: Sale }) {
  const { organization } = useOrg()
  const can = useCan()
  const format = useOrgFormat()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const voided = sale.status === "voided"
  const balance = balanceDue(sale.total, sale.paidTotal)
  const methods = [...new Set(sale.payments.map((payment) => PAYMENT_METHOD_LABELS[payment.method]))]

  const facts = [
    { label: "Cliente", value: sale.customerName ?? "Venta de mostrador" },
    {
      label: "Pago",
      value: !voided && balance > 0 ? `Debe ${format.money(balance)}` : methods.join(" + ") || PAYMENT_METHOD_LABELS[sale.paymentMethod],
    },
    { label: "Vendió", value: sale.sellerName ?? "—" },
  ]

  return (
    <>
      <SheetHeader className="gap-1 border-b px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <SheetTitle className="text-lg font-semibold">Venta #{sale.number}</SheetTitle>
          {voided ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">Anulada</span>
          ) : null}
        </div>
        <SheetDescription>{formatDateTime(sale.soldAt, organization.timezone, organization.locale)}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 p-5">
        {voided && sale.voidReason ? (
          <div className="rounded-2xl bg-destructive/8 p-3.5 text-sm">
            <p className="text-xs font-medium text-destructive">Motivo de la anulación</p>
            <p className="mt-0.5">{sale.voidReason}</p>
          </div>
        ) : null}

        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-border/70">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0 bg-card p-3">
              <dt className="text-[11px] text-muted-foreground">{fact.label}</dt>
              <dd className="mt-0.5 truncate text-sm font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <ul className={cn("divide-y divide-border/70 rounded-2xl border", voided && "opacity-60")}>
          {sale.items.map((item, index) => {
            const lineProfit = item.unitCost === null ? null : item.lineTotal - item.unitCost * item.quantity
            return (
              <li key={`${item.productId ?? item.name}-${index}`} className="flex items-start gap-3 px-3.5 py-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums">
                  {item.quantity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {format.money(item.unitPrice)} c/u
                    {item.unitCost !== null ? ` · costo ${format.money(item.unitCost)}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{format.money(item.lineTotal)}</p>
                  {lineProfit !== null ? (
                    <p className={cn("text-xs tabular-nums", lineProfit >= 0 ? "text-success" : "text-destructive")}>
                      {lineProfit >= 0 ? "+" : "−"}
                      {format.money(Math.abs(lineProfit))}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        <dl className="grid gap-1.5 text-sm">
          {sale.discount > 0 ? (
            <>
              <Row label="Subtotal" value={format.money(sale.subtotal)} />
              <Row label="Descuento" value={`−${format.money(sale.discount)}`} />
            </>
          ) : null}
          <Row label="Total" value={format.money(sale.total)} strong />
          {sale.profit !== null ? (
            <Row
              label="Ganancia"
              value={`${format.money(sale.profit)}${sale.total > 0 ? ` · ${format.percent(sale.profit / sale.total)}` : ""}`}
              className={sale.profit >= 0 ? "text-success" : "text-destructive"}
            />
          ) : null}
        </dl>

        <PaymentTimeline sale={sale} />

        {sale.notes ? (
          <div className="rounded-2xl border p-3.5">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="mt-1 text-sm whitespace-pre-line">{sale.notes}</p>
          </div>
        ) : null}

        {!voided && can("sales.void") ? (
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
            <Ban data-icon="inline-start" />
            Anular venta
          </Button>
        ) : null}
      </div>

      <VoidSaleDialog sale={sale} open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  )
}

function VoidSaleDialog({ sale, open, onOpenChange }: { sale: Sale; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { organization } = useOrg()
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const reasonId = useId()

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    startTransition(async () => {
      const result = await voidSale(organization.slug, { saleId: sale.id, reason })
      if (!result.ok) {
        setError(result.error.fieldErrors?.reason ?? result.error.message)
        return
      }
      toast.success(`Venta #${sale.number} anulada. El stock volvió al inventario.`)
      setReason("")
      setError(null)
      onOpenChange(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular la venta #{sale.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Los productos vuelven al inventario y la venta deja de contar en tus números. Queda registrada en la actividad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field data-invalid={error !== null}>
            <FieldLabel htmlFor={reasonId}>Motivo</FieldLabel>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="Devolución, error al registrar…"
              aria-invalid={error !== null}
              autoFocus
            />
            {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              Cancelar
            </AlertDialogCancel>
            <SubmitButton variant="destructive" pending={pending}>
              Anular
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Row({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <dt className={cn(!className && "text-muted-foreground")}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-lg font-semibold" : "font-medium")}>{value}</dd>
    </div>
  )
}
