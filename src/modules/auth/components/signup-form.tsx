"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"

import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { FieldGroup } from "@/components/ui/field"
import { applyActionError } from "@/lib/forms"

import { signUp } from "../application/actions"
import { signUpSchema, type SignUpInput } from "../domain/schemas"
import { CheckEmail } from "./check-email"

export function SignupForm() {
  const [pending, startTransition] = useTransition()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await signUp(values)
      if (!result.ok) return applyActionError(form, result.error)
      setSentTo(result.data.email)
    }),
  )

  if (sentTo) {
    return (
      <CheckEmail title="Revisa tu correo">
        Enviamos un enlace de confirmación a <span className="font-medium text-foreground">{sentTo}</span>. Ábrelo
        para activar tu cuenta y configurar tu negocio.
      </CheckEmail>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormTextField
          control={form.control}
          name="fullName"
          label="Tu nombre"
          autoComplete="name"
          placeholder="Ana Gómez"
          autoFocus
        />
        <FormTextField
          control={form.control}
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@negocio.com"
        />
        <FormTextField
          control={form.control}
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          description="Mínimo 8 caracteres, con letras y números."
        />
        <SubmitButton pending={pending} size="lg" className="w-full">
          Crear cuenta
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
