import type { Metadata } from "next"
import { Suspense } from "react"

import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { OrganizationSettingsForm } from "@/modules/organizations/components/organization-settings-form"
import { SettingsSectionSkeleton } from "@/modules/settings/components/settings-section-skeleton"

export const metadata: Metadata = { title: "Configuración del negocio" }

type OrganizationSettingsPageProps = PageProps<"/[orgSlug]/settings">

export default function OrganizationSettingsPage({ params }: OrganizationSettingsPageProps) {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <OrganizationSettings params={params} />
    </Suspense>
  )
}

async function OrganizationSettings({ params }: Pick<OrganizationSettingsPageProps, "params">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)

  return (
    <OrganizationSettingsForm organization={context.organization} readOnly={!can(context, "settings.manage")} />
  )
}
