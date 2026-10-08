"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"

import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { FieldGroup } from "@/components/ui/field"
import { applyActionError } from "@/lib/forms"

import { requestPasswordReset } from "../application/actions"
import { forgotPasswordSchema, type ForgotPasswordInput } from "../domain/schemas"
import { CheckEmail } from "./check-email"

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await requestPasswordReset(values)
      if (!result.ok) return applyActionError(form, result.error)
      setSentTo(values.email)
    }),
  )

  if (sentTo) {
    return (
      <CheckEmail title="Revisa tu correo">
        Si existe una cuenta con <span className="font-medium text-foreground">{sentTo}</span>, recibirás un enlace
        para crear una nueva contraseña.
      </CheckEmail>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormTextField
          control={form.control}
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@negocio.com"
          autoFocus
        />
        <SubmitButton pending={pending} size="lg" className="w-full">
          Enviar enlace
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
