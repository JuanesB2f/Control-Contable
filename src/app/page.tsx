import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { LAST_ORGANIZATION_COOKIE, routes } from "@/config/routes"
import { getMyOrganizations } from "@/modules/organizations/application/queries"

// Pure redirect: it always depends on the session, so it may block.
export const instant = false

export default async function HomePage() {
  const organizations = await getMyOrganizations()
  if (organizations.length === 0) redirect(routes.onboarding)

  const lastSlug = (await cookies()).get(LAST_ORGANIZATION_COOKIE)?.value
  const target = organizations.find((organization) => organization.slug === lastSlug) ?? organizations[0]
  redirect(routes.org.dashboard(target.slug))
}
