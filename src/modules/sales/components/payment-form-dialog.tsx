"use client"

import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { SegmentedControl } from "@/components/data/segmented-control"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useOrgFormat } from "@/hooks/use-org-format"
import { parseDecimal, roundMoney } from "@/lib/money"
import { useOrg } from "@/modules/access/components/org-provider"
import { localDateKey } from "@/modules/analytics/domain/period"

import { addSalePayment } from "../application/actions"
import { DEFAULT_CREDIT_DAYS, addDays } from "../domain/due-dates"
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "../domain/schemas"
import { AmountInput } from "./amount-input"
import { BankField } from "./bank-field"
import { DueDateField } from "./due-date"
import { ReceiptPicker, type PickedReceipt } from "./receipt-picker"
import { useReceiptUpload } from "./use-receipt-upload"

const PAYMENT_OPTIONS = PAYMENT_METHODS.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))

type PaymentFormDialogProps = {
  sale: { id: string; number: number; balance: number; dueDate: string | null }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentFormDialog({ sale, open, onOpenChange }: PaymentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open ? <PaymentForm sale={sale} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function PaymentForm({ sale, onDone }: { sale: PaymentFormDialogProps["sale"]; onDone: () => void }) {
  const { organization } = useOrg()
  const format = useOrgFormat()
  const uploadReceipt = useReceiptUpload()
  const [pending, startTransition] = useTransition()
  const [amountText, setAmountText] = useState(() => format.number(sale.balance))
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [bank, setBank] = useState("")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [receipt, setReceipt] = useState<PickedReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [todayKey] = useState(() => localDateKey(new Date(), organization.timezone))
  const [dueDate, setDueDate] = useState(() =>
    sale.dueDate && sale.dueDate >= todayKey ? sale.dueDate : addDays(todayKey, DEFAULT_CREDIT_DAYS),
  )
  const amountId = useId()
  const dueDateId = useId()
  const bankId = useId()
  const referenceId = useId()
  const noteId = useId()

  const amount = parseDecimal(amountText)
  const amountIsValid = Number.isFinite(amount) && amount > 0 && amount <= sale.balance
  const remaining = amountIsValid ? roundMoney(sale.balance - amount) : sale.balance
  const needsBank = method === "transfer" && bank.trim().length < 2
  const leavesBalance = amountIsValid && remaining > 0
  const invalidDueDate = leavesBalance && (dueDate === "" || dueDate < todayKey)
  const blocked = !amountIsValid || needsBank || invalidDueDate

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (blocked) return
    startTransition(async () => {
      const result = await addSalePayment(organization.slug, {
        saleId: sale.id,
        amount: roundMoney(amount),
        method,
        bank: method === "transfer" ? bank.trim() : undefined,
        reference: method !== "cash" && reference.trim() ? reference.trim() : undefined,
        note: note.trim() || undefined,
        dueDate: leavesBalance ? dueDate : undefined,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      if (receipt) {
        const receiptError = await uploadReceipt(result.data.paymentId, receipt.file)
        if (receiptError) toast.warning(`El abono quedó registrado, pero el comprobante no: ${receiptError}`)
      }
      toast.success(remaining > 0 ? `Abono registrado. Queda debiendo ${format.money(remaining)}.` : `Venta #${sale.number} pagada por completo.`)
      onDone()
    })
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="text-[17px] font-semibold">Registrar abono</DialogTitle>
        <DialogDescription>
          Venta #{sale.number} · debe {format.money(sale.balance)}. Queda guardado con la fecha y hora de hoy.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <Field data-invalid={!amountIsValid}>
          <FieldLabel htmlFor={amountId}>Valor del abono</FieldLabel>
          <AmountInput id={amountId} value={amountText} onValueChange={setAmountText} label="Valor del abono" invalid={!amountIsValid} autoFocus />
          <FieldDescription className={!amountIsValid ? "text-destructive" : undefined}>
            {!amountIsValid
              ? Number.isFinite(amount) && amount > sale.balance
                ? `No puede ser mayor que lo que debe (${format.money(sale.balance)}).`
                : "Escribe un valor mayor que cero."
              : remaining > 0
                ? `Después de este abono quedará debiendo ${format.money(remaining)}.`
                : "Con este abono la venta queda pagada por completo."}
          </FieldDescription>
        </Field>

        <div className="grid gap-2">
          <p className="text-sm font-medium">¿Cómo pagó?</p>
          <SegmentedControl value={method} onValueChange={setMethod} options={PAYMENT_OPTIONS} label="Método de pago" className="grid grid-cols-4" />
        </div>

        {method === "transfer" ? (
          <Field>
            <FieldLabel htmlFor={bankId}>Banco</FieldLabel>
            <BankField id={bankId} value={bank} onChange={setBank} />
          </Field>
        ) : null}

        {method !== "cash" ? (
          <>
            <Field>
              <FieldLabel htmlFor={referenceId}>Referencia o número de aprobación (opcional)</FieldLabel>
              <Input id={referenceId} value={reference} onChange={(event) => setReference(event.target.value)} maxLength={60} placeholder="Ej. 004512" />
            </Field>
            <ReceiptPicker value={receipt} onChange={setReceipt} />
          </>
        ) : null}

        {leavesBalance ? (
          <Field data-invalid={invalidDueDate}>
            <FieldLabel htmlFor={dueDateId}>¿Cuándo paga el resto?</FieldLabel>
            <DueDateField id={dueDateId} value={dueDate} onChange={setDueDate} todayKey={todayKey} />
            {invalidDueDate ? <FieldDescription className="text-destructive">Elige una fecha de hoy en adelante.</FieldDescription> : null}
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor={noteId}>Nota (opcional)</FieldLabel>
          <Textarea id={noteId} value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={200} placeholder="Pagó su hija, quedó de traer el resto el viernes…" />
        </Field>

        {error ? <p className="rounded-xl bg-destructive/8 p-3 text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} disabled={blocked}>
          Guardar abono
        </SubmitButton>
      </DialogFooter>
    </form>
  )
}
