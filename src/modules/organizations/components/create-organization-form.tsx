"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRef, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"

import { FormSelectField } from "@/components/forms/form-select-field"
import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { FieldGroup } from "@/components/ui/field"
import { applyActionError } from "@/lib/forms"

import { createOrganization } from "../application/actions"
import { BUSINESS_TYPES, COUNTRIES, findCountry } from "../domain/options"
import { createOrganizationSchema, type CreateOrganizationInput } from "../domain/schemas"
import { slugify } from "../domain/slug"

const countryOptions = COUNTRIES.map((country) => ({ value: country.code, label: country.name }))
const businessTypeOptions = BUSINESS_TYPES.map((type) => ({ value: type, label: type }))

function urlPrefix() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  return `${new URL(siteUrl).host}/`
}

export function CreateOrganizationForm() {
  const [pending, startTransition] = useTransition()
  const slugEdited = useRef(false)

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: "", slug: "", businessType: undefined, country: "CO" },
  })

  const country = findCountry(useWatch({ control: form.control, name: "country" }))

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await createOrganization(values)
      if (!result.ok) applyActionError(form, result.error)
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormTextField
          control={form.control}
          name="name"
          label="Nombre del negocio"
          placeholder="Ej. Tienda Aurora"
          autoComplete="organization"
          autoFocus
          onInput={(event) => {
            if (!slugEdited.current) {
              form.setValue("slug", slugify(event.currentTarget.value), { shouldValidate: form.formState.isSubmitted })
            }
          }}
        />
        <FormTextField
          control={form.control}
          name="slug"
          label="Dirección de tu espacio"
          prefix={urlPrefix()}
          autoCapitalize="none"
          spellCheck={false}
          description="Así se verá el enlace de tu negocio. Puedes personalizarlo."
          onInput={() => {
            slugEdited.current = true
          }}
        />
        <FormSelectField
          control={form.control}
          name="businessType"
          label="Tipo de negocio"
          placeholder="Selecciona el que más se parezca"
          options={businessTypeOptions}
        />
        <FormSelectField
          control={form.control}
          name="country"
          label="País"
          options={countryOptions}
          description={
            country ? `Usaremos ${country.currency} como moneda y la hora de ${country.timezone.split("/").at(-1)?.replaceAll("_", " ")}.` : undefined
          }
        />
        <SubmitButton pending={pending} size="lg" className="w-full">
          Crear mi negocio
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
