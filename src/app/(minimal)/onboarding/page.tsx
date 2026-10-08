import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { routes } from "@/config/routes"
import { signOut } from "@/modules/auth/application/actions"
import { AuthCard } from "@/modules/auth/components/auth-card"
import { getMyOrganizations } from "@/modules/organizations/application/queries"
import { CreateOrganizationForm } from "@/modules/organizations/components/create-organization-form"

export const metadata: Metadata = { title: "Configura tu negocio" }

async function OnboardingFooter() {
  const organizations = await getMyOrganizations()
  const first = organizations[0]

  if (first) {
    return (
      <Button variant="ghost" asChild>
        <Link href={routes.org.dashboard(first.slug)}>
          <ArrowLeft data-icon="inline-start" />
          Volver a {first.name}
        </Link>
      </Button>
    )
  }

  return (
    <form action={signOut}>
      <Button variant="ghost" type="submit" className="text-muted-foreground">
        Usar otra cuenta
      </Button>
    </form>
  )
}

export default function OnboardingPage() {
  return (
    <AuthCard
      title="Configura tu negocio"
      description="Solo toma un minuto. Podrás cambiar todo esto después."
      footer={
        <Suspense fallback={null}>
          <OnboardingFooter />
        </Suspense>
      }
    >
      <CreateOrganizationForm />
    </AuthCard>
  )
}
