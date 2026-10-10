"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

import { FormSelectField } from "@/components/forms/form-select-field"
import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { applyActionError } from "@/lib/forms"
import { useOrg } from "@/modules/access/components/org-provider"

import { createExpense } from "../application/actions"
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, expenseSchema } from "../domain/finance"

type ExpenseFormInput = z.input<typeof expenseSchema>
type ExpenseFormValues = z.output<typeof expenseSchema>

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((value) => ({ value, label: EXPENSE_CATEGORY_LABELS[value] }))

type ExpenseFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Today in the organization's timezone, as YYYY-MM-DD. */
  today: string
}

export function ExpenseFormDialog({ open, onOpenChange, today }: ExpenseFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open ? <ExpenseForm today={today} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ExpenseForm({ today, onDone }: { today: string; onDone: () => void }) {
  const { organization } = useOrg()
  const [pending, startTransition] = useTransition()
  const form = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: "other", description: "", amount: "", spentOn: today },
  })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await createExpense(organization.slug, values)
      if (!result.ok) {
        applyActionError(form, result.error)
        return
      }
      toast.success("Gasto registrado")
      onDone()
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="text-[17px] font-semibold">Registrar gasto</DialogTitle>
        <DialogDescription>Arriendo, servicios, publicidad… Lo que cuesta mantener el negocio abierto.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormTextField control={form.control} name="description" label="Concepto" placeholder="Arriendo de octubre" autoFocus />
        </div>
        <FormSelectField control={form.control} name="category" label="Categoría" options={CATEGORY_OPTIONS} />
        <FormTextField control={form.control} name="amount" label="Valor" prefix="$" inputMode="decimal" placeholder="0" />
        <div className="sm:col-span-2">
          <FormTextField control={form.control} name="spentOn" label="Fecha" type="date" max={today} />
        </div>
      </FieldGroup>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending}>Guardar gasto</SubmitButton>
      </DialogFooter>
    </form>
  )
}
