"use client"

import { CircleCheck, Minus, PackageSearch, Plus, ShoppingBag, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { SearchField } from "@/components/data/search-field"
import { SegmentedControl } from "@/components/data/segmented-control"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useOrgFormat } from "@/hooks/use-org-format"
import { parseDecimal, roundMoney } from "@/lib/money"
import { matchesSearch } from "@/lib/search"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"
import { localDateKey } from "@/modules/analytics/domain/period"
import { ProductImage } from "@/modules/products/components/product-image"
import type { Product } from "@/modules/products/domain/types"

import { createSale } from "../application/actions"
import { computeCartTotals } from "../domain/cart"
import { DEFAULT_CREDIT_DAYS, addDays, formatDueDate } from "../domain/due-dates"
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "../domain/schemas"
import { AmountInput } from "./amount-input"
import { BankField } from "./bank-field"
import { CustomerPicker, type CustomerOption } from "./customer-picker"
import { DueDateField } from "./due-date"
import { ReceiptPicker, type PickedReceipt } from "./receipt-picker"
import { useReceiptUpload } from "./use-receipt-upload"

type NewSaleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  /** Null when the seller can't read customers. */
  customers: CustomerOption[] | null
}

export function NewSaleDialog({ open, onOpenChange, products, customers }: NewSaleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-dvh max-h-dvh w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[min(780px,calc(100dvh-3rem))] sm:max-w-[calc(100%-3rem)] sm:rounded-2xl lg:max-w-5xl">
        {open ? <SaleBuilder products={products} customers={customers} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

type CartEntry = { productId: string; quantity: number; priceText: string }
type CompletedSale = {
  number: number
  total: number
  profit: number | null
  change: number | null
  paid: number
  balance: number
  dueDate: string | null
}
type PaymentMode = "full" | "partial"

const PAYMENT_OPTIONS = PAYMENT_METHODS.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))
const MODE_OPTIONS = [
  { value: "full" as const, label: "Pago completo" },
  { value: "partial" as const, label: "Abono o fiado" },
]
const DISCOUNT_STEPS = [0.05, 0.1, 0.15]

function SaleBuilder({
  products,
  customers,
  onClose,
}: {
  products: Product[]
  customers: CustomerOption[] | null
  onClose: () => void
}) {
  const { organization } = useOrg()
  const can = useCan()
  const format = useOrgFormat()
  const [pending, startTransition] = useTransition()
  const [view, setView] = useState<"catalog" | "cart">("catalog")
  const [query, setQuery] = useState("")
  const [cart, setCart] = useState<CartEntry[]>([])
  const [customer, setCustomer] = useState<CustomerOption | null>(null)
  const [payment, setPayment] = useState<PaymentMethod>("cash")
  const [discountText, setDiscountText] = useState("")
  const [receivedText, setReceivedText] = useState("")
  const [mode, setMode] = useState<PaymentMode>("full")
  const [paidText, setPaidText] = useState("")
  const [bank, setBank] = useState("")
  const [reference, setReference] = useState("")
  const [receipt, setReceipt] = useState<PickedReceipt | null>(null)
  const [todayKey] = useState(() => localDateKey(new Date(), organization.timezone))
  const [dueDate, setDueDate] = useState(() => addDays(todayKey, DEFAULT_CREDIT_DAYS))
  const [completed, setCompleted] = useState<CompletedSale | null>(null)
  const uploadReceipt = useReceiptUpload()

  const byId = new Map(products.map((product) => [product.id, product]))
  const catalog = products
    .filter((product) => product.isActive && matchesSearch(query, product.name, product.sku, product.category))
    .toSorted((a, b) => b.unitsSold30d - a.unitsSold30d || a.name.localeCompare(b.name))

  const lines = cart.flatMap((entry) => {
    const product = byId.get(entry.productId)
    if (!product) return []
    const unitPrice = parseDecimal(entry.priceText)
    return [{ ...entry, product, unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : Number.NaN }]
  })
  const discount = parseDecimal(discountText)
  const totals = computeCartTotals(
    lines.map((line) => ({ quantity: line.quantity, unitPrice: Number.isNaN(line.unitPrice) ? 0 : line.unitPrice, unitCost: line.product.costPrice })),
    Number.isFinite(discount) ? discount : 0,
  )
  const partial = mode === "partial"
  const paidNow = partial ? (paidText.trim() === "" ? 0 : parseDecimal(paidText)) : totals.total
  const paidIsValid = Number.isFinite(paidNow) && paidNow >= 0 && (!partial || paidNow < totals.total)
  const balance = partial && paidIsValid ? roundMoney(totals.total - paidNow) : 0
  const receivesMoney = paidIsValid && paidNow > 0
  const needsCustomer = partial && customer === null
  const needsBank = payment === "transfer" && receivesMoney && bank.trim().length < 2
  const invalidDueDate = partial && (dueDate === "" || dueDate < todayKey)

  const received = parseDecimal(receivedText)
  const hasReceived = !partial && payment === "cash" && Number.isFinite(received) && received > 0
  const change = hasReceived && received >= totals.total ? roundMoney(received - totals.total) : null
  const cashMissing = hasReceived && received < totals.total ? roundMoney(totals.total - received) : 0
  const invalidPrice = lines.some((line) => Number.isNaN(line.unitPrice))
  const blocked = lines.length === 0 || invalidPrice || cashMissing > 0 || !paidIsValid || needsCustomer || needsBank || invalidDueDate
  const quantityInCart = (productId: string) => cart.find((entry) => entry.productId === productId)?.quantity ?? 0

  const add = (product: Product) => {
    if (quantityInCart(product.id) >= product.stock) return
    setCart((current) =>
      current.some((entry) => entry.productId === product.id)
        ? current.map((entry) => (entry.productId === product.id ? { ...entry, quantity: entry.quantity + 1 } : entry))
        : [...current, { productId: product.id, quantity: 1, priceText: format.number(product.salePrice) }],
    )
  }

  const update = (productId: string, patch: Partial<CartEntry>) =>
    setCart((current) => current.map((entry) => (entry.productId === productId ? { ...entry, ...patch } : entry)))

  const remove = (productId: string) => setCart((current) => current.filter((entry) => entry.productId !== productId))

  const reset = () => {
    setCart([])
    setCustomer(null)
    setPayment("cash")
    setDiscountText("")
    setReceivedText("")
    setMode("full")
    setPaidText("")
    setBank("")
    setReference("")
    setReceipt(null)
    setDueDate(addDays(todayKey, DEFAULT_CREDIT_DAYS))
    setQuery("")
    setView("catalog")
    setCompleted(null)
  }

  const submit = () => {
    if (blocked) return
    startTransition(async () => {
      const result = await createSale(organization.slug, {
        customerId: customer?.id,
        paymentMethod: payment,
        discount: totals.discount,
        paidAmount: partial ? roundMoney(paidNow) : undefined,
        bank: payment === "transfer" && receivesMoney ? bank.trim() : undefined,
        reference: payment !== "cash" && receivesMoney && reference.trim() ? reference.trim() : undefined,
        dueDate: partial ? dueDate : undefined,
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })),
      })
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      if (receipt && result.data.paymentId) {
        const receiptError = await uploadReceipt(result.data.paymentId, receipt.file)
        if (receiptError) toast.warning(`La venta quedó registrada, pero el comprobante no: ${receiptError} Puedes adjuntarlo desde el detalle.`)
      }
      setCompleted({
        number: result.data.number,
        total: totals.total,
        profit: totals.profit,
        change,
        paid: paidNow,
        balance,
        dueDate: partial ? dueDate : null,
      })
    })
  }

  if (completed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
          <CircleCheck className="size-8" />
        </span>
        <div className="space-y-1">
          <DialogTitle className="text-xl font-semibold">Venta #{completed.number} registrada</DialogTitle>
          <DialogDescription>
            {completed.balance > 0 ? "El inventario ya se descontó y el saldo quedó a nombre del cliente." : "El inventario ya se descontó."}
          </DialogDescription>
        </div>
        <dl className="grid w-full max-w-xs gap-2 rounded-2xl bg-muted/60 p-4 text-sm">
          <SummaryRow label={completed.balance > 0 ? "Total de la venta" : "Total cobrado"} value={format.money(completed.total)} strong />
          {completed.balance > 0 ? (
            <>
              <SummaryRow label="Abonó" value={format.money(completed.paid)} />
              <SummaryRow label="Queda debiendo" value={format.money(completed.balance)} className="text-warning" />
              {completed.dueDate ? <SummaryRow label="Paga el resto" value={formatDueDate(completed.dueDate, organization.locale)} /> : null}
            </>
          ) : null}
          {completed.change !== null && completed.change > 0 ? <SummaryRow label="Cambio a entregar" value={format.money(completed.change)} /> : null}
          {completed.profit !== null ? (
            <SummaryRow
              label="Ganaste"
              value={format.money(completed.profit)}
              className={completed.profit >= 0 ? "text-success" : "text-destructive"}
            />
          ) : null}
        </dl>
        <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Listo
          </Button>
          <Button className="flex-1" onClick={reset}>
            <Plus data-icon="inline-start" />
            Otra venta
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3 pr-12 sm:px-5">
        <div className="min-w-0">
          <DialogTitle className="text-[17px] font-semibold">Nueva venta</DialogTitle>
          <DialogDescription className="max-sm:sr-only">Toca los productos, ajusta cantidades y cobra.</DialogDescription>
        </div>
        <SegmentedControl
          value={view}
          onValueChange={setView}
          label="Sección de la venta"
          className="ml-auto md:hidden"
          options={[
            { value: "catalog", label: "Productos" },
            { value: "cart", label: totals.units ? `Carrito (${totals.units})` : "Carrito" },
          ]}
        />
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
        <section className={cn("flex min-h-0 flex-col", view !== "catalog" && "max-md:hidden")}>
          <div className="p-3 sm:p-4">
            <SearchField value={query} onValueChange={setQuery} placeholder="Buscar producto o código" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-4 sm:pb-4">
            {catalog.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <PackageSearch className="size-8" />
                {products.length === 0 ? "Aún no tienes productos activos." : "Ningún producto coincide."}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
                {catalog.map((product) => {
                  const inCart = quantityInCart(product.id)
                  const available = product.stock - inCart
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => add(product)}
                        disabled={available <= 0}
                        className={cn(
                          "relative flex h-full w-full flex-col gap-2 rounded-2xl border bg-card p-3 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
                          inCart > 0 ? "border-primary/60 ring-2 ring-primary/15" : "hover:border-primary/40",
                        )}
                      >
                        {inCart > 0 ? (
                          <span className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
                            {inCart}
                          </span>
                        ) : null}
                        <span className="flex items-start gap-2.5">
                          <ProductImage name={product.name} url={product.imageUrl} className="size-11" sizes="44px" />
                          <span className="line-clamp-2 text-sm leading-snug font-medium">{product.name}</span>
                        </span>
                        <span className="mt-auto flex items-end justify-between gap-2">
                          <span className="text-[15px] font-semibold tabular-nums">{format.money(product.salePrice)}</span>
                          <span className={cn("text-[11px] tabular-nums", available <= product.minStock ? "text-warning" : "text-muted-foreground")}>
                            {product.stock <= 0 ? "Agotado" : `${format.number(available)} disp.`}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {lines.length > 0 ? (
            <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
              <Button size="lg" className="w-full justify-between" onClick={() => setView("cart")}>
                <span className="flex items-center gap-2">
                  <ShoppingBag />
                  Ver carrito · {totals.units}
                </span>
                <span className="tabular-nums">{format.money(totals.total)}</span>
              </Button>
            </div>
          ) : null}
        </section>

        <section className={cn("flex min-h-0 flex-col bg-muted/30 md:border-l", view !== "cart" && "max-md:hidden")}>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {customers ? (
              <CustomerPicker customers={customers} value={customer} onChange={setCustomer} canCreate={can("customers.write")} />
            ) : null}

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                <ShoppingBag className="size-7" />
                Toca un producto para agregarlo.
                <Button variant="link" size="sm" className="md:hidden" onClick={() => setView("catalog")}>
                  Ir a productos
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {lines.map((line) => {
                  const belowCost = line.product.costPrice !== null && line.unitPrice < line.product.costPrice
                  return (
                    <li key={line.productId} className="rounded-2xl bg-card p-3 shadow-xs ring-1 ring-border/60">
                      <div className="flex items-start gap-2.5">
                        <ProductImage name={line.product.name} url={line.product.imageUrl} className="size-9 rounded-lg" sizes="36px" />
                        <p className="min-w-0 flex-1 text-sm leading-snug font-medium">{line.product.name}</p>
                        <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${line.product.name}`} onClick={() => remove(line.productId)}>
                          <Trash2 />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-lg bg-muted p-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Restar uno"
                            onClick={() => (line.quantity <= 1 ? remove(line.productId) : update(line.productId, { quantity: line.quantity - 1 }))}
                          >
                            <Minus />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Sumar uno"
                            disabled={line.quantity >= line.product.stock}
                            onClick={() => update(line.productId, { quantity: line.quantity + 1 })}
                          >
                            <Plus />
                          </Button>
                        </div>
                        <AmountInput
                          value={line.priceText}
                          onValueChange={(priceText) => update(line.productId, { priceText })}
                          label={`Precio de ${line.product.name}`}
                          invalid={Number.isNaN(line.unitPrice)}
                          className="h-8 w-28"
                        />
                        <span className="ml-auto text-sm font-semibold tabular-nums">
                          {Number.isNaN(line.unitPrice) ? "—" : format.money(line.quantity * line.unitPrice)}
                        </span>
                      </div>
                      {belowCost ? (
                        <p className="mt-1.5 text-xs text-destructive">
                          Por debajo de tu costo ({format.money(line.product.costPrice ?? 0)}). Pierdes en esta línea.
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}

            {lines.length > 0 ? (
              <>
                <div className="grid gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Descuento</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <AmountInput value={discountText} onValueChange={setDiscountText} label="Descuento" placeholder="0" className="h-9 w-36" />
                    {DISCOUNT_STEPS.map((step) => (
                      <Chip key={step} onClick={() => setDiscountText(format.number(Math.round(totals.subtotal * step)))}>
                        −{format.percent(step)}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <p className="text-xs font-medium text-muted-foreground">¿Cómo te pagan?</p>
                  <SegmentedControl value={payment} onValueChange={setPayment} options={PAYMENT_OPTIONS} label="Método de pago" className="grid grid-cols-4" />
                  {customers ? (
                    <SegmentedControl value={mode} onValueChange={setMode} options={MODE_OPTIONS} label="Forma de pago" className="grid grid-cols-2" />
                  ) : null}
                </div>

                {partial ? (
                  <div className="grid gap-2 rounded-2xl bg-card p-3 ring-1 ring-border/60">
                    <p className="text-xs font-medium text-muted-foreground">¿Cuánto abona hoy?</p>
                    <AmountInput
                      value={paidText}
                      onValueChange={setPaidText}
                      label="Abono de hoy"
                      placeholder="0"
                      invalid={!paidIsValid}
                      className="h-10 w-full sm:w-56"
                    />
                    {!paidIsValid ? (
                      <p className="text-sm text-destructive">
                        {Number.isFinite(paidNow) && paidNow >= totals.total
                          ? "Si paga todo, usa Pago completo."
                          : "Escribe un valor válido."}
                      </p>
                    ) : (
                      <p className="text-sm">
                        Queda debiendo <span className="font-semibold text-warning tabular-nums">{format.money(balance)}</span>
                        {paidNow === 0 ? " (fiado)" : null}
                      </p>
                    )}
                    {needsCustomer ? (
                      <p className="text-xs text-destructive">Elige el cliente arriba para dejarle el saldo a su nombre.</p>
                    ) : null}
                    <p className="mt-1 text-xs font-medium text-muted-foreground">¿Cuándo paga el resto?</p>
                    <DueDateField value={dueDate} onChange={setDueDate} todayKey={todayKey} />
                    {invalidDueDate ? (
                      <p className="text-xs text-destructive">Elige una fecha de hoy en adelante.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Paga el resto a más tardar el {formatDueDate(dueDate, organization.locale, { weekday: "long", day: "numeric", month: "long" })}.
                        La venta se marcará como vencida si pasa esa fecha.
                      </p>
                    )}
                  </div>
                ) : null}

                {payment !== "cash" && receivesMoney ? (
                  <div className="grid gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60">
                    {payment === "transfer" ? (
                      <div className="grid gap-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Banco</p>
                        <BankField value={bank} onChange={setBank} />
                        {needsBank ? <p className="text-xs text-muted-foreground">Elige el banco para poder registrar el pago.</p> : null}
                      </div>
                    ) : null}
                    <div className="grid gap-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Referencia o número de aprobación (opcional)</p>
                      <Input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={60} placeholder="Ej. 004512" aria-label="Referencia" />
                    </div>
                    <ReceiptPicker value={receipt} onChange={setReceipt} />
                  </div>
                ) : null}

                {!partial && payment === "cash" ? (
                  <div className="grid gap-2">
                    <p className="text-xs font-medium text-muted-foreground">¿Con cuánto paga?</p>
                    <AmountInput
                      value={receivedText}
                      onValueChange={setReceivedText}
                      label="Dinero recibido"
                      placeholder={format.number(totals.total)}
                      invalid={cashMissing > 0}
                      className="h-10 w-full sm:w-56"
                    />
                    {cashMissing > 0 ? (
                      <p className="text-sm text-destructive">
                        Faltan <span className="font-semibold tabular-nums">{format.money(cashMissing)}</span> para completar el pago
                      </p>
                    ) : change !== null ? (
                      <p className="text-sm">
                        {change > 0 ? (
                          <>
                            Devuelves <span className="font-semibold tabular-nums">{format.money(change)}</span>
                          </>
                        ) : (
                          "Pago exacto, sin cambio"
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <dl className="mb-3 grid gap-1 text-sm">
              {totals.discount > 0 ? (
                <>
                  <SummaryRow label="Subtotal" value={format.money(totals.subtotal)} />
                  <SummaryRow label="Descuento" value={`−${format.money(totals.discount)}`} />
                </>
              ) : null}
              <SummaryRow label="Total" value={format.money(totals.total)} strong />
              {partial && paidIsValid && lines.length > 0 ? (
                <SummaryRow label="Queda debiendo" value={format.money(balance)} className="text-warning" />
              ) : null}
              {totals.profit !== null && lines.length > 0 ? (
                <SummaryRow
                  label="Tu ganancia"
                  value={`${format.money(totals.profit)}${totals.margin !== null ? ` · ${format.percent(totals.margin)}` : ""}`}
                  className={totals.profit >= 0 ? "text-success" : "text-destructive"}
                />
              ) : null}
            </dl>
            <SubmitButton type="button" size="lg" className="w-full" pending={pending} disabled={blocked} onClick={submit}>
              {lines.length === 0
                ? "Agrega productos"
                : !partial
                  ? `Cobrar ${format.money(totals.total)}`
                  : receivesMoney
                    ? `Registrar abono de ${format.money(paidNow)}`
                    : "Registrar venta fiada"}
            </SubmitButton>
          </div>
        </section>
      </div>
    </div>
  )
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 rounded-full border bg-card px-3 text-[13px] font-medium tabular-nums transition-colors hover:bg-muted"
    >
      {children}
    </button>
  )
}

function SummaryRow({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <dt className={cn(!strong && "text-muted-foreground", !strong && className && "text-current")}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-xl font-semibold tracking-tight" : "font-medium")}>{value}</dd>
    </div>
  )
}
