import type { Metadata } from "next"

import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { OrganizationSettingsForm } from "@/modules/organizations/components/organization-settings-form"

export const metadata: Metadata = { title: "Configuración del negocio" }

export default async function OrganizationSettingsPage({ params }: PageProps<"/[orgSlug]/settings">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)

  return (
    <OrganizationSettingsForm organization={context.organization} readOnly={!can(context, "settings.manage")} />
  )
}
