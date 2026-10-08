"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { FieldGroup } from "@/components/ui/field"
import { applyActionError } from "@/lib/forms"
import { cn } from "@/lib/utils"

import { updatePassword } from "../application/actions"
import { updatePasswordSchema, type UpdatePasswordInput } from "../domain/schemas"

type UpdatePasswordFormProps = {
  /** Where to go after a successful change. Stays on the page when omitted. */
  redirectTo?: string
  submitLabel?: string
  className?: string
}

export function UpdatePasswordForm({ redirectTo, submitLabel = "Guardar contraseña", className }: UpdatePasswordFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const form = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await updatePassword(values)
      if (!result.ok) return applyActionError(form, result.error)
      toast.success("Contraseña actualizada")
      form.reset()
      if (redirectTo) router.replace(redirectTo)
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className={className}>
      <FieldGroup>
        <FormTextField
          control={form.control}
          name="password"
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          description="Mínimo 8 caracteres, con letras y números."
        />
        <FormTextField
          control={form.control}
          name="confirmPassword"
          label="Confirma la contraseña"
          type="password"
          autoComplete="new-password"
        />
        <SubmitButton pending={pending} size={redirectTo ? "lg" : "default"} className={cn(redirectTo ? "w-full" : "self-start")}>
          {submitLabel}
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
