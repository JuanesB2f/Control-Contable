import { CalendarX2, CircleCheck, Link2Off, UserRoundX } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { routes } from "@/config/routes"
import { getInvitation } from "@/modules/access/application/queries"
import { requireUser } from "@/modules/access/application/session"
import { AcceptInvitationButton } from "@/modules/access/components/accept-invitation-button"
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/modules/access/domain/permissions"
import { AuthFormSkeleton } from "@/modules/auth/components/auth-form-skeleton"
import { signOut } from "@/modules/auth/application/actions"

export const metadata: Metadata = { title: "Invitación" }

async function InvitationView({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params
  const user = await requireUser()
  const invitation = await getInvitation(token)

  const goHome = (
    <Button variant="outline" asChild>
      <Link href={routes.home}>Ir a mi cuenta</Link>
    </Button>
  )

  if (!invitation || invitation.status === "revoked") {
    return (
      <EmptyState
        icon={Link2Off}
        title="Invitación no disponible"
        description="Este enlace no es válido o la invitación fue cancelada. Pide a tu equipo una nueva."
        action={goHome}
      />
    )
  }
  if (invitation.status === "expired") {
    return (
      <EmptyState
        icon={CalendarX2}
        title="Esta invitación expiró"
        description={`Pide a alguien de ${invitation.organizationName} que te envíe una nueva.`}
        action={goHome}
      />
    )
  }
  if (invitation.status === "accepted") {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Invitación ya utilizada"
        description="Si ya eres parte del equipo, encontrarás el negocio en tu cuenta."
        action={goHome}
      />
    )
  }
  if (invitation.email !== user.email) {
    return (
      <EmptyState
        icon={UserRoundX}
        title="Esta invitación es para otra cuenta"
        description={`Fue enviada a ${invitation.email}, pero iniciaste sesión como ${user.email}.`}
        action={
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Cambiar de cuenta
            </Button>
          </form>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 py-2 text-center">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {invitation.inviterName ?? "Tu equipo"} te invitó a unirte a
        </p>
        <p className="text-2xl font-semibold tracking-tight">{invitation.organizationName}</p>
      </div>
      <div className="rounded-xl bg-muted px-4 py-3 text-left">
        <p className="text-sm font-medium">{ROLE_LABELS[invitation.role]}</p>
        <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[invitation.role]}</p>
      </div>
      <AcceptInvitationButton token={token} />
    </div>
  )
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Card className="w-full">
      <CardContent>
        <Suspense fallback={<AuthFormSkeleton fields={1} />}>
          <InvitationView params={params} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
