"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { routes } from "@/config/routes"
import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result"
import { isUniqueViolation, mapDatabaseError } from "@/lib/supabase/errors"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { authorizeOrgAction } from "@/modules/access/application/org-context"
import { getCurrentUser } from "@/modules/access/application/session"

import { findCountry } from "../domain/options"
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from "../domain/schemas"

export async function createOrganization(input: CreateOrganizationInput): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("unauthenticated", "Tu sesión expiró. Vuelve a iniciar sesión.")

  const parsed = createOrganizationSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const country = findCountry(parsed.data.country)
  if (!country) return fail("validation", "Selecciona un país.", { country: "Selecciona un país." })

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_business_type: parsed.data.businessType,
    p_country: country.code,
    p_currency: country.currency,
    p_timezone: country.timezone,
  })

  if (error) {
    if (isUniqueViolation(error)) {
      return fail("conflict", "Esa dirección ya está en uso.", { slug: "Esa dirección ya está en uso. Prueba otra." })
    }
    return mapDatabaseError(error)
  }

  redirect(routes.org.dashboard(data.slug))
}

export async function updateOrganization(orgSlug: string, input: UpdateOrganizationInput): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "settings.manage")
  if (!auth.ok) return auth

  const parsed = updateOrganizationSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const locale = findCountry(parsed.data.country)?.locale ?? auth.context.organization.locale
  const { error } = await auth.supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      business_type: parsed.data.businessType ?? null,
      country: parsed.data.country,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
      locale,
    })
    .eq("id", auth.context.organization.id)

  if (error) return mapDatabaseError(error)

  revalidatePath(`/${orgSlug}`, "layout")
  return ok()
}
