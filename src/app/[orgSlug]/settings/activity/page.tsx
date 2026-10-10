import { History } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { NoAccess } from "@/components/feedback/no-access"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime, formatRelativeTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { can, requireOrgContext } from "@/modules/access/application/org-context"
import { getRecentActivity } from "@/modules/audit/application/queries"
import type { AuditTone } from "@/modules/audit/domain/describe"
import { SettingsSectionSkeleton } from "@/modules/settings/components/settings-section-skeleton"

export const metadata: Metadata = { title: "Actividad" }

const TONE_CLASSES: Record<AuditTone, string> = {
  neutral: "bg-muted-foreground/50",
  positive: "bg-success",
  warning: "bg-warning",
}

type ActivityPageProps = PageProps<"/[orgSlug]/settings/activity">

export default function ActivityPage({ params }: ActivityPageProps) {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <Activity params={params} />
    </Suspense>
  )
}

async function Activity({ params }: Pick<ActivityPageProps, "params">) {
  const { orgSlug } = await params
  const context = await requireOrgContext(orgSlug)

  if (!can(context, "audit.read")) {
    return (
      <Card>
        <NoAccess description="El registro de actividad solo está disponible para propietarios y administradores." />
      </Card>
    )
  }

  const activity = await getRecentActivity(context)
  const now = new Date()

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="text-[15px] font-semibold">Actividad reciente</CardTitle>
        <CardDescription>Cambios importantes en tu negocio. Este registro no se puede editar ni borrar.</CardDescription>
      </CardHeader>
      {activity.length === 0 ? (
        <EmptyState icon={History} title="Aún no hay actividad" description="Aquí verás quién hizo qué y cuándo." />
      ) : (
        <ol className="divide-y divide-border/70">
          {activity.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_CLASSES[item.tone])} aria-hidden />
              <p className="min-w-0 flex-1 text-sm text-pretty">{item.summary}</p>
              <time
                dateTime={item.createdAt}
                title={formatDateTime(item.createdAt, context.organization.timezone)}
                className="shrink-0 text-[13px] text-muted-foreground"
              >
                {formatRelativeTime(item.createdAt, now)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
