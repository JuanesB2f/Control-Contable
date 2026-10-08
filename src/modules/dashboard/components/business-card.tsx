import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { OrgAvatar } from "@/components/data/org-avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { findCountry } from "@/modules/organizations/domain/options"
import type { Organization } from "@/modules/organizations/domain/types"

export function BusinessCard({ organization, href }: { organization: Organization; href: string }) {
  const rows = [
    { label: "País", value: findCountry(organization.country)?.name ?? organization.country },
    { label: "Moneda", value: organization.currency },
    { label: "Zona horaria", value: organization.timezone.replaceAll("_", " ") },
  ]

  return (
    <Card className="group/business relative transition-shadow hover:shadow-md">
      <CardHeader className="flex items-center gap-3">
        <OrgAvatar name={organization.name} seed={organization.id} className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-[15px] font-semibold">{organization.name}</CardTitle>
          <CardDescription className="truncate">{organization.business_type ?? "Tu negocio"}</CardDescription>
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover/business:translate-x-0.5" />
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border/70">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="truncate font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <Link href={href} className="absolute inset-0 rounded-2xl" aria-label="Configurar negocio" />
    </Card>
  )
}
