import type { Metadata } from "next"
import { Suspense } from "react"

import { NoAccess } from "@/components/feedback/no-access"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/dates"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { getTeam } from "@/modules/access/application/queries"
import { InvitationsList } from "@/modules/access/components/invitations-list"
import { InviteMemberDialog } from "@/modules/access/components/invite-member-dialog"
import { MembersList } from "@/modules/access/components/members-list"
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type AppRole } from "@/modules/access/domain/permissions"
import { SettingsSectionSkeleton } from "@/modules/settings/components/settings-section-skeleton"

export const metadata: Metadata = { title: "Equipo" }

const ROLES_IN_ORDER: AppRole[] = ["owner", "admin", "employee"]

type MembersPageProps = PageProps<"/[orgSlug]/settings/members">

export default function MembersPage({ params, searchParams }: MembersPageProps) {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <Members params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Members({ params, searchParams }: Pick<MembersPageProps, "params" | "searchParams">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)

  if (!can(context, "members.read")) {
    return (
      <Card>
        <NoAccess />
      </Card>
    )
  }

  const [team, { invite }] = await Promise.all([getTeam(context), searchParams])
  const timezone = context.organization.timezone
  const members = team.members.map((member) => ({ ...member, joinedLabel: formatDate(member.joinedAt, timezone) }))
  const invitations = team.invitations.map((invitation) => ({
    ...invitation,
    expiresLabel: formatDate(invitation.expiresAt, timezone),
  }))

  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-0 pb-0">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle className="text-[15px] font-semibold">Miembros</CardTitle>
          <CardDescription>
            {members.length === 1 ? "1 persona" : `${members.length} personas`} con acceso a {context.organization.name}
          </CardDescription>
          {team.canManage ? (
            <CardAction>
              <InviteMemberDialog key={String(invite === "1")} defaultOpen={invite === "1"} />
            </CardAction>
          ) : null}
        </CardHeader>
        <MembersList members={members} canManage={team.canManage} />
      </Card>

      {invitations.length > 0 ? (
        <Card className="gap-0 pb-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <CardTitle className="text-[15px] font-semibold">Invitaciones pendientes</CardTitle>
            <CardDescription>Cada enlace es de un solo uso y vence a los 7 días.</CardDescription>
          </CardHeader>
          <InvitationsList invitations={invitations} />
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Roles</CardTitle>
          <CardDescription>Lo que puede hacer cada persona en el negocio.</CardDescription>
        </CardHeader>
        <dl className="grid gap-3 px-5 sm:grid-cols-3">
          {ROLES_IN_ORDER.map((role) => (
            <div key={role} className="rounded-xl bg-muted/60 p-3.5">
              <dt className="text-sm font-medium">{ROLE_LABELS[role]}</dt>
              <dd className="mt-1 text-[13px] text-muted-foreground text-pretty">{ROLE_DESCRIPTIONS[role]}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
