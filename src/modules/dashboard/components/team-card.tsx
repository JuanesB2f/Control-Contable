import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { UserAvatar } from "@/components/data/user-avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TeamMember } from "@/modules/access/infrastructure/repository"

type TeamCardProps = {
  members: TeamMember[]
  pendingInvitations: number
  href: string
}

export function TeamCard({ members, pendingInvitations, href }: TeamCardProps) {
  const visible = members.slice(0, 5)

  return (
    <Card className="group/team relative transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Tu equipo</CardTitle>
        <CardDescription>
          {members.length === 1 ? "Solo tú por ahora" : `${members.length} personas`}
          {pendingInvitations > 0 ? ` · ${pendingInvitations} invitación${pendingInvitations === 1 ? "" : "es"} pendiente${pendingInvitations === 1 ? "" : "s"}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {visible.map((member) => (
            <UserAvatar
              key={member.userId}
              name={member.fullName ?? member.email ?? "?"}
              imageUrl={member.avatarUrl}
              className="size-9 ring-2 ring-card"
            />
          ))}
          {members.length > visible.length ? (
            <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium ring-2 ring-card">
              +{members.length - visible.length}
            </span>
          ) : null}
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover/team:translate-x-0.5" />
      </CardContent>
      <Link href={href} className="absolute inset-0 rounded-2xl" aria-label="Ver equipo" />
    </Card>
  )
}
