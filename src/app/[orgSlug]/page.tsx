import { redirect } from "next/navigation"

import { routes } from "@/config/routes"

export const instant = false

export default async function OrganizationIndexPage({ params }: PageProps<"/[orgSlug]">) {
  const { orgSlug } = await params
  redirect(routes.org.dashboard(orgSlug))
}
