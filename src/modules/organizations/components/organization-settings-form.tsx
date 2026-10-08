"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormSelectField } from "@/components/forms/form-select-field"
import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { applyActionError } from "@/lib/forms"

import { updateOrganization } from "../application/actions"
import { BUSINESS_TYPES, COUNTRIES, COUNTRY_CODES, CURRENCIES, CURRENCY_CODES, TIMEZONES, findCountry } from "../domain/options"
import { updateOrganizationSchema, type UpdateOrganizationInput } from "../domain/schemas"
import type { Organization } from "../domain/types"

const countryOptions = COUNTRIES.map((country) => ({ value: country.code, label: country.name }))
const currencyOptions = CURRENCIES.map((currency) => ({ value: currency.code, label: `${currency.code} · ${currency.name}` }))
const timezoneOptions = TIMEZONES.map((timezone) => ({ value: timezone, label: timezone.replaceAll("_", " ") }))
const businessTypeOptions = BUSINESS_TYPES.map((type) => ({ value: type, label: type }))

function defaultsFrom(organization: Organization): UpdateOrganizationInput {
  const country = COUNTRY_CODES.find((code) => code === organization.country) ?? "CO"
  return {
    name: organization.name,
    businessType: BUSINESS_TYPES.find((type) => type === organization.business_type),
    country,
    currency: CURRENCY_CODES.find((code) => code === organization.currency) ?? findCountry(country)?.currency ?? "USD",
    timezone: organization.timezone,
  }
}

type OrganizationSettingsFormProps = {
  organization: Organization
  readOnly: boolean
}

export function OrganizationSettingsForm({ organization, readOnly }: OrganizationSettingsFormProps) {
  const [pending, startTransition] = useTransition()
  const form = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: defaultsFrom(organization),
  })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await updateOrganization(organization.slug, values)
      if (!result.ok) {
        applyActionError(form, result.error)
        return
      }
      form.reset(values)
      toast.success("Cambios guardados")
    }),
  )

  const onCountryChange = (code: string) => {
    const country = findCountry(code)
    if (!country) return
    form.setValue("currency", country.currency, { shouldDirty: true })
    form.setValue("timezone", country.timezone, { shouldDirty: true })
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Datos del negocio</CardTitle>
          <CardDescription>
            {readOnly
              ? "Solo los administradores pueden cambiar estos datos."
              : "Se usan en reportes, facturas y para mostrar las fechas en tu hora local."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset disabled={readOnly || pending} className="min-w-0">
            <FieldGroup className="grid gap-5 sm:grid-cols-2">
              <FormTextField
                control={form.control}
                name="name"
                label="Nombre"
                autoComplete="organization"
                description={`Dirección: /${organization.slug}`}
              />
              <FormSelectField
                control={form.control}
                name="businessType"
                label="Tipo de negocio"
                options={businessTypeOptions}
                disabled={readOnly}
              />
              <FormSelectField
                control={form.control}
                name="country"
                label="País"
                options={countryOptions}
                disabled={readOnly}
                onValueChange={onCountryChange}
              />
              <FormSelectField
                control={form.control}
                name="currency"
                label="Moneda"
                options={currencyOptions}
                disabled={readOnly}
              />
              <FormSelectField
                control={form.control}
                name="timezone"
                label="Zona horaria"
                options={timezoneOptions}
                disabled={readOnly}
              />
            </FieldGroup>
          </fieldset>
        </CardContent>
        {readOnly ? null : (
          <CardFooter className="justify-end gap-2">
            <SubmitButton pending={pending} disabled={!form.formState.isDirty}>
              Guardar cambios
            </SubmitButton>
          </CardFooter>
        )}
      </Card>
    </form>
  )
}
