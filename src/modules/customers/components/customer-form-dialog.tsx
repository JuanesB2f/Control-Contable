"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { applyActionError } from "@/lib/forms"
import { useOrg } from "@/modules/access/components/org-provider"

import { createCustomer, updateCustomer } from "../application/actions"
import { customerSchema, type Customer } from "../domain/schemas"

type CustomerFormInput = z.input<typeof customerSchema>
type CustomerFormValues = z.output<typeof customerSchema>

type CustomerFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Null to create a new customer. */
  customer: Customer | null
  /** Name to prefill when creating from a search. */
  initialName?: string
  onSaved?: (customer: { id: string; name: string }) => void
}

export function CustomerFormDialog({ open, onOpenChange, customer, initialName, onSaved }: CustomerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {open ? (
          <CustomerForm
            customer={customer}
            initialName={initialName}
            onDone={(saved) => {
              onSaved?.(saved)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type CustomerFormProps = {
  customer: Customer | null
  initialName?: string
  onDone: (customer: { id: string; name: string }) => void
}

function CustomerForm({ customer, initialName, onDone }: CustomerFormProps) {
  const { organization } = useOrg()
  const [pending, startTransition] = useTransition()
  const notesId = useId()
  const isEditing = customer !== null

  const form = useForm<CustomerFormInput, unknown, CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? initialName ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      document: customer?.document ?? "",
      notes: customer?.notes ?? "",
    },
  })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      if (isEditing) {
        const result = await updateCustomer(organization.slug, customer.id, values)
        if (!result.ok) {
          applyActionError(form, result.error)
          return
        }
        toast.success("Cliente actualizado")
        onDone({ id: customer.id, name: values.name })
        return
      }

      const result = await createCustomer(organization.slug, values)
      if (!result.ok) {
        applyActionError(form, result.error)
        return
      }
      toast.success(`${result.data.name} ya está en tus clientes`)
      onDone(result.data)
    }),
  )

  return (
    <form
      onSubmit={(event) => {
        event.stopPropagation()
        return onSubmit(event)
      }}
      noValidate
      className="grid gap-5"
    >
      <DialogHeader>
        <DialogTitle className="text-[17px] font-semibold">{isEditing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        <DialogDescription>Solo el nombre es obligatorio. El teléfono te permite escribirle por WhatsApp.</DialogDescription>
      </DialogHeader>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormTextField control={form.control} name="name" label="Nombre" placeholder="María Gómez" autoFocus autoComplete="off" />
        </div>
        <FormTextField control={form.control} name="phone" label="Teléfono" placeholder="300 123 4567" inputMode="tel" autoComplete="off" />
        <FormTextField control={form.control} name="document" label="Documento" placeholder="Cédula o NIT" autoComplete="off" />
        <div className="sm:col-span-2">
          <FormTextField control={form.control} name="email" label="Correo" placeholder="maria@correo.com" type="email" autoComplete="off" />
        </div>
        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor={notesId}>Notas</FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id={notesId}
                rows={3}
                placeholder="Preferencias, alergias, cómo la conociste…"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending}>{isEditing ? "Guardar cambios" : "Agregar cliente"}</SubmitButton>
      </DialogFooter>
    </form>
  )
}
