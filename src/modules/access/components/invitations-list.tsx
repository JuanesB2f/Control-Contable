"use client"

import { Mail } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { revokeInvitation } from "../application/actions"
import { ROLE_LABELS } from "../domain/permissions"
import type { PendingInvitation } from "../infrastructure/repository"
import { useOrg } from "./org-provider"

type InvitationRowProps = { invitation: PendingInvitation & { expiresLabel: string } }

function InvitationRow({ invitation }: InvitationRowProps) {
  const { organization } = useOrg()
  const [pending, startTransition] = useTransition()

  const revoke = () =>
    startTransition(async () => {
      const result = await revokeInvitation(organization.slug, invitation.id)
      if (result.ok) toast.success(`Invitación a ${invitation.email} cancelada`)
      else toast.error(result.error.message)
    })

  return (
    <li className="flex items-center gap-3 px-5 py-3.5" aria-busy={pending}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Mail className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p className="truncate text-[13px] text-muted-foreground">
          {ROLE_LABELS[invitation.role]} · Vence el {invitation.expiresLabel}
          {invitation.invitedBy ? <span className="hidden sm:inline"> · Invitado por {invitation.invitedBy}</span> : null}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending} onClick={revoke}>
        Cancelar
      </Button>
    </li>
  )
}

export function InvitationsList({ invitations }: { invitations: InvitationRowProps["invitation"][] }) {
  return (
    <ul className="divide-y divide-border/70">
      {invitations.map((invitation) => (
        <InvitationRow key={invitation.id} invitation={invitation} />
      ))}
    </ul>
  )
}
