"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { applyActionError } from "@/lib/forms"

import { updateProfile } from "../application/actions"
import { updateProfileSchema, type UpdateProfileInput } from "../domain/schemas"

export function ProfileForm({ fullName, email }: { fullName: string | null; email: string }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName: fullName ?? "" },
  })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await updateProfile(values)
      if (!result.ok) return applyActionError(form, result.error)
      form.reset(values)
      toast.success("Perfil actualizado")
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormTextField control={form.control} name="fullName" label="Nombre completo" autoComplete="name" />
        <Field>
          <FieldLabel htmlFor="profile-email">Correo electrónico</FieldLabel>
          <Input id="profile-email" value={email} readOnly disabled />
          <FieldDescription>Es el correo con el que inicias sesión.</FieldDescription>
        </Field>
        <SubmitButton pending={pending} disabled={!form.formState.isDirty} className="self-start">
          Guardar cambios
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
