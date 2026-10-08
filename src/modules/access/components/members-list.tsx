"use client"

import { Ellipsis, UserMinus } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { UserAvatar } from "@/components/data/user-avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { removeMember, updateMemberRole } from "../application/actions"
import { ASSIGNABLE_ROLES, ROLE_LABELS, type AppRole } from "../domain/permissions"
import type { TeamMember } from "../infrastructure/repository"
import { useOrg } from "./org-provider"

function isAssignableRole(role: string): role is (typeof ASSIGNABLE_ROLES)[number] {
  return ASSIGNABLE_ROLES.some((value) => value === role)
}

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <Badge variant={role === "owner" ? "default" : "secondary"} className="font-medium">
      {ROLE_LABELS[role]}
    </Badge>
  )
}

type MemberRowProps = {
  member: TeamMember
  isSelf: boolean
  canManage: boolean
  joinedLabel: string
}

function MemberRow({ member, isSelf, canManage, joinedLabel }: MemberRowProps) {
  const { organization } = useOrg()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const displayName = member.fullName ?? member.email ?? "Sin nombre"
  const manageable = canManage && !isSelf && member.role !== "owner"

  const changeRole = (role: string) => {
    if (!isAssignableRole(role) || role === member.role) return
    startTransition(async () => {
      const result = await updateMemberRole(organization.slug, { userId: member.userId, role })
      if (result.ok) toast.success(`${displayName} ahora es ${ROLE_LABELS[role].toLowerCase()}`)
      else toast.error(result.error.message)
    })
  }

  const remove = () =>
    startTransition(async () => {
      const result = await removeMember(organization.slug, member.userId)
      if (result.ok) {
        setConfirmOpen(false)
        toast.success(`${displayName} ya no forma parte del equipo`)
      } else {
        toast.error(result.error.message)
      }
    })

  return (
    <li className="flex items-center gap-3 px-5 py-3.5" aria-busy={pending}>
      <UserAvatar name={displayName} imageUrl={member.avatarUrl} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {displayName}
          {isSelf ? <span className="font-normal text-muted-foreground"> (tú)</span> : null}
        </p>
        <p className="truncate text-[13px] text-muted-foreground">
          {member.email}
          <span className="hidden sm:inline"> · Desde el {joinedLabel}</span>
        </p>
      </div>
      <RoleBadge role={member.role} />
      {manageable ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`Opciones para ${displayName}`}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Rol</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={member.role} onValueChange={changeRole}>
                {ASSIGNABLE_ROLES.map((role) => (
                  <DropdownMenuRadioItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                <UserMinus />
                Quitar del equipo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Quitar a {displayName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Perderá el acceso a {organization.name} de inmediato. Su historial de actividad se conserva.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={pending}
                  onClick={(event) => {
                    event.preventDefault()
                    remove()
                  }}
                >
                  Quitar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </li>
  )
}

type MembersListProps = {
  members: (TeamMember & { joinedLabel: string })[]
  canManage: boolean
}

export function MembersList({ members, canManage }: MembersListProps) {
  const { user } = useOrg()

  return (
    <ul className="divide-y divide-border/70">
      {members.map((member) => (
        <MemberRow
          key={member.userId}
          member={member}
          joinedLabel={member.joinedLabel}
          isSelf={member.userId === user.id}
          canManage={canManage}
        />
      ))}
    </ul>
  )
}
