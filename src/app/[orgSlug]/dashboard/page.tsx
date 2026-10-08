import type { Metadata } from "next"
import { connection } from "next/server"

import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { routes } from "@/config/routes"
import { greetingFor } from "@/lib/dates"
import { requireOrgContext } from "@/modules/access/application/org-context"
import { getTeam } from "@/modules/access/application/queries"
import { BusinessCard } from "@/modules/dashboard/components/business-card"
import { GettingStarted, type GettingStartedStep } from "@/modules/dashboard/components/getting-started"
import { TeamCard } from "@/modules/dashboard/components/team-card"

export const metadata: Metadata = { title: "Inicio" }

export default async function DashboardPage({ params }: PageProps<"/[orgSlug]/dashboard">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)
  const team = await getTeam(context)
  await connection()

  const firstName = context.user.fullName?.split(" ")[0]
  const greeting = greetingFor(new Date(), context.organization.timezone)
  const hasTeam = team.members.length > 1 || team.invitations.length > 0

  const steps: GettingStartedStep[] = [
    {
      id: "organization",
      title: "Crea tu negocio",
      description: "Tu espacio está listo y protegido.",
      done: true,
    },
    ...(team.canManage
      ? [
          {
            id: "team",
            title: "Invita a tu equipo",
            description: "Cada persona entra con su propia cuenta y permisos.",
            done: hasTeam,
            href: `${routes.org.members(orgSlug)}?invite=1`,
            cta: "Invitar",
          },
        ]
      : []),
    {
      id: "products",
      title: "Agrega tus productos",
      description: "Precios, costos y stock para conocer tu margen real.",
      done: false,
      comingSoon: true,
    },
    {
      id: "sale",
      title: "Registra tu primera venta",
      description: "El inventario y tus números se actualizan solos.",
      done: false,
      comingSoon: true,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={`${greeting}${firstName ? `, ${firstName}` : ""} 👋`}
        description="Esto es lo que está pasando en tu negocio."
      />
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="lg:col-span-2">
          <GettingStarted steps={steps} />
        </div>
        <div className="flex flex-col gap-4 lg:gap-5">
          <BusinessCard organization={context.organization} href={routes.org.settings(orgSlug)} />
          <TeamCard
            members={team.members}
            pendingInvitations={team.invitations.length}
            href={routes.org.members(orgSlug)}
          />
        </div>
      </div>
    </PageContainer>
  )
}
