"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"

import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { FieldGroup } from "@/components/ui/field"
import { routes } from "@/config/routes"
import { applyActionError } from "@/lib/forms"

import { signIn } from "../application/actions"
import { signInSchema, type SignInInput } from "../domain/schemas"

const LINK_ERRORS: Record<string, string> = {
  link_invalid: "El enlace no es válido o ya expiró. Solicita uno nuevo.",
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? undefined
  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""]
  const [pending, startTransition] = useTransition()

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await signIn(values, next)
      if (!result.ok) applyActionError(form, result.error)
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {linkError ? (
          <p className="flex items-start gap-2 rounded-xl bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {linkError}
          </p>
        ) : null}
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
        <FormTextField
          control={form.control}
          name="password"
          label={
            <span className="flex w-full items-center justify-between">
              Contraseña
              <Link
                href={routes.forgotPassword}
                className="text-[13px] font-normal text-primary hover:underline"
                tabIndex={-1}
              >
                ¿La olvidaste?
              </Link>
            </span>
          }
          type="password"
          autoComplete="current-password"
        />
        <SubmitButton pending={pending} size="lg" className="w-full">
          Iniciar sesión
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
