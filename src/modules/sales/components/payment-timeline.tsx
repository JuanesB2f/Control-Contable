"use client"

import { Ban, CalendarClock, CircleCheck, ExternalLink, ImageOff, ImagePlus, Loader2, Plus, ShoppingBag } from "lucide-react"
import Image from "next/image"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { Meter } from "@/components/data/meter"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useOrgFormat } from "@/hooks/use-org-format"
import { formatDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"
import { localDateKey } from "@/modules/analytics/domain/period"

import { setSaleDueDate } from "../application/actions"
import { DEFAULT_CREDIT_DAYS, addDays, dueStatus, formatDueDate } from "../domain/due-dates"
import { PAYMENT_STATUS_LABELS, balanceDue, paymentStatus, type SalePayment } from "../domain/payments"
import { PAYMENT_METHOD_LABELS, type Sale } from "../domain/schemas"
import { DueBadge, DueDateField } from "./due-date"
import { PaymentFormDialog } from "./payment-form-dialog"
import { PAYMENT_ICONS } from "./payment-icons"
import { useReceiptUpload } from "./use-receipt-upload"

const STATUS_STYLES = {
  paid: "bg-success/12 text-success",
  partial: "bg-warning/15 text-warning",
  pending: "bg-destructive/10 text-destructive",
} as const

/** Dated trail of a sale: when it was made, every payment received, and how it ended. */
export function PaymentTimeline({ sale }: { sale: Sale }) {
  const { organization } = useOrg()
  const can = useCan()
  const format = useOrgFormat()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [viewing, setViewing] = useState<SalePayment | null>(null)
  const voided = sale.status === "voided"
  const balance = balanceDue(sale.total, sale.paidTotal)
  const status = paymentStatus(sale.total, sale.paidTotal)
  const canCollect = !voided && balance > 0 && can("sales.create")
  const when = (value: string) => formatDateTime(value, organization.timezone, organization.locale)
  const lastPayment = sale.payments.at(-1)
  const [todayKey] = useState(() => localDateKey(new Date(), organization.timezone))
  const [dueOpen, setDueOpen] = useState(false)
  const due = dueStatus(sale.dueDate, todayKey)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Pagos</h3>
        {!voided ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[status])}>{PAYMENT_STATUS_LABELS[status]}</span>
        ) : null}
      </div>

      {!voided && sale.total > 0 ? (
        <div className="grid gap-2 rounded-2xl bg-muted/50 p-3.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Pagado <span className="font-semibold text-foreground tabular-nums">{format.money(sale.paidTotal)}</span> de{" "}
              <span className="tabular-nums">{format.money(sale.total)}</span>
            </span>
            {balance > 0 ? <span className="font-semibold text-warning tabular-nums">Debe {format.money(balance)}</span> : null}
          </div>
          <Meter value={sale.paidTotal / sale.total} tone={balance > 0 ? "warning" : "success"} label="Avance del pago" className="h-2" />
          {balance > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {sale.dueDate ? `Fecha límite: ${formatDueDate(sale.dueDate, organization.locale)}` : "Sin fecha límite"}
              </span>
              <DueBadge dueDate={sale.dueDate} todayKey={todayKey} />
            </div>
          ) : null}
        </div>
      ) : null}

      <ol className="relative flex flex-col gap-4 pl-9 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-px before:bg-border">
        <TimelineItem icon={ShoppingBag} tone="neutral" title={`Venta registrada por ${format.money(sale.total)}`} date={when(sale.soldAt)}>
          {sale.sellerName ? <p className="text-xs text-muted-foreground">Vendió {sale.sellerName}</p> : null}
        </TimelineItem>

        {sale.payments.map((payment, index) => {
          const Icon = PAYMENT_ICONS[payment.method]
          const fullPayment = index === 0 && payment.amount === sale.total
          const details = [PAYMENT_METHOD_LABELS[payment.method], payment.bank, payment.reference ? `Ref. ${payment.reference}` : null].filter(Boolean)
          return (
            <TimelineItem
              key={payment.id}
              icon={Icon}
              tone="positive"
              title={`${fullPayment ? "Pago" : "Abono"} de ${format.money(payment.amount)}`}
              date={when(payment.paidAt)}
            >
              <p className="text-xs text-muted-foreground">
                {details.join(" · ")}
                {payment.receivedBy ? ` · recibió ${payment.receivedBy}` : ""}
              </p>
              {payment.note ? <p className="mt-1 text-xs whitespace-pre-line">{payment.note}</p> : null}
              {payment.receiptUrl ? (
                <button
                  type="button"
                  onClick={() => setViewing(payment)}
                  className="mt-2 flex items-center gap-2.5 rounded-xl border bg-card p-1.5 pr-3 text-left text-xs font-medium transition-colors hover:bg-muted"
                >
                  <span className="relative size-10 overflow-hidden rounded-lg bg-muted">
                    <ReceiptImage key={payment.receiptUrl} src={payment.receiptUrl} alt="" sizes="40px" className="object-cover" />
                  </span>
                  Ver comprobante
                </button>
              ) : payment.method !== "cash" && can("sales.create") ? (
                <AttachReceiptButton paymentId={payment.id} />
              ) : null}
            </TimelineItem>
          )
        })}

        {voided ? (
          <TimelineItem icon={Ban} tone="negative" title="Venta anulada" date={sale.voidedAt ? when(sale.voidedAt) : null} />
        ) : balance === 0 && lastPayment && sale.payments.length > 1 ? (
          <TimelineItem icon={CircleCheck} tone="positive" title="Saldada por completo" date={when(lastPayment.paidAt)} />
        ) : balance > 0 ? (
          <TimelineItem
            icon={CalendarClock}
            tone={due.status === "overdue" || due.status === "today" ? "negative" : "warning"}
            title={`Pendiente: ${format.money(balance)}`}
            date={sale.dueDate ? `Hasta el ${formatDueDate(sale.dueDate, organization.locale)}` : null}
          >
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <DueBadge dueDate={sale.dueDate} todayKey={todayKey} />
              <span className="text-xs text-muted-foreground">
                {sale.customerName ? `A nombre de ${sale.customerName}` : "Sin cliente asignado"}
              </span>
            </div>
            {can("sales.create") ? (
              <Button variant="link" size="sm" className="h-auto px-0 py-1 text-xs" onClick={() => setDueOpen(true)}>
                {sale.dueDate ? "Cambiar fecha de pago" : "Poner fecha de pago"}
              </Button>
            ) : null}
          </TimelineItem>
        ) : null}
      </ol>

      {canCollect ? (
        <Button onClick={() => setPaymentOpen(true)}>
          <Plus data-icon="inline-start" />
          Registrar abono
        </Button>
      ) : null}

      {canCollect ? (
        <>
          <PaymentFormDialog
            sale={{ id: sale.id, number: sale.number, balance, dueDate: sale.dueDate }}
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
          />
          <DueDateDialog sale={sale} todayKey={todayKey} open={dueOpen} onOpenChange={setDueOpen} />
        </>
      ) : null}
      <ReceiptViewer payment={viewing} onOpenChange={(open) => !open && setViewing(null)} when={when} />
    </section>
  )
}

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  negative: "bg-destructive/10 text-destructive",
} as const

function TimelineItem({
  icon: Icon,
  tone,
  title,
  date,
  children,
}: {
  icon: typeof ShoppingBag
  tone: keyof typeof TONES
  title: string
  date: string | null
  children?: React.ReactNode
}) {
  return (
    <li className="relative">
      <span className={cn("absolute top-0 -left-9 flex size-7 items-center justify-center rounded-full ring-4 ring-card", TONES[tone])}>
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-sm font-medium">{title}</p>
        {date ? <time className="text-[11px] text-muted-foreground tabular-nums">{date}</time> : null}
      </div>
      {children}
    </li>
  )
}

function AttachReceiptButton({ paymentId }: { paymentId: string }) {
  const uploadReceipt = useReceiptUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" className="mt-2 border-dashed" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ImagePlus data-icon="inline-start" />}
        Adjuntar comprobante
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (!file) return
          setPending(true)
          const error = await uploadReceipt(paymentId, file)
          setPending(false)
          if (error) toast.error(error)
          else toast.success("Comprobante guardado")
        }}
      />
    </>
  )
}

/** Receipt photo that shows a spinner while it downloads and a clear message if it can't be shown. */
function ReceiptImage({ src, alt, sizes, className, eager }: { src: string; alt: string; sizes: string; className: string; eager?: boolean }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={cn(className, "transition-opacity duration-300", state === "loaded" ? "opacity-100" : "opacity-0")}
      />
      {state !== "loaded" ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground">
          {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <ImageOff className="size-4" />}
          {eager ? (state === "loading" ? "Cargando comprobante…" : "No se pudo mostrar. Prueba abrirlo en otra pestaña.") : null}
        </span>
      ) : null}
    </>
  )
}

type DueDateDialogProps = { sale: Sale; todayKey: string; open: boolean; onOpenChange: (open: boolean) => void }

function DueDateDialog({ sale, todayKey, open, onOpenChange }: DueDateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {open ? <DueDateForm sale={sale} todayKey={todayKey} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function DueDateForm({ sale, todayKey, onDone }: { sale: Sale; todayKey: string; onDone: () => void }) {
  const { organization } = useOrg()
  const [dueDate, setDueDate] = useState(sale.dueDate && sale.dueDate >= todayKey ? sale.dueDate : addDays(todayKey, DEFAULT_CREDIT_DAYS))
  const [pending, startTransition] = useTransition()
  const invalid = dueDate === "" || dueDate < todayKey

  const save = () =>
    startTransition(async () => {
      const result = await setSaleDueDate(organization.slug, { saleId: sale.id, dueDate })
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success(`Nueva fecha de pago: ${formatDueDate(dueDate, organization.locale)}`)
      onDone()
    })

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-[17px] font-semibold">Fecha de pago</DialogTitle>
        <DialogDescription>¿Hasta cuándo tiene para pagar el resto de la venta #{sale.number}? El cambio queda en la actividad.</DialogDescription>
      </DialogHeader>
      <DueDateField value={dueDate} onChange={setDueDate} todayKey={todayKey} />
      {invalid ? <p className="text-xs text-destructive">Elige una fecha de hoy en adelante.</p> : null}
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <SubmitButton type="button" pending={pending} disabled={invalid} onClick={save}>
          Guardar fecha
        </SubmitButton>
      </DialogFooter>
    </div>
  )
}

function ReceiptViewer({
  payment,
  onOpenChange,
  when,
}: {
  payment: SalePayment | null
  onOpenChange: (open: boolean) => void
  when: (value: string) => string
}) {
  const format = useOrgFormat()
  return (
    <Dialog open={payment !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-3 sm:max-w-lg">
        {payment?.receiptUrl ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-[17px] font-semibold">Comprobante · {format.money(payment.amount)}</DialogTitle>
              <DialogDescription>
                {[PAYMENT_METHOD_LABELS[payment.method], payment.bank, when(payment.paidAt)].filter(Boolean).join(" · ")}
              </DialogDescription>
            </DialogHeader>
            <div className="relative h-[min(65dvh,560px)] overflow-hidden rounded-xl bg-muted">
              <ReceiptImage
                key={payment.receiptUrl}
                src={payment.receiptUrl}
                alt="Comprobante de pago"
                sizes="(max-width: 640px) 100vw, 512px"
                className="object-contain"
                eager
              />
            </div>
            <Button variant="outline" asChild>
              <a href={payment.receiptUrl} target="_blank" rel="noreferrer">
                <ExternalLink data-icon="inline-start" />
                Abrir en otra pestaña
              </a>
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
