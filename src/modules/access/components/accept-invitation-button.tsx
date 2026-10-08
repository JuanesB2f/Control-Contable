"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { SubmitButton } from "@/components/forms/submit-button"

import { acceptInvitation } from "../application/actions"

export function AcceptInvitationButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          const result = await acceptInvitation(token)
          if (!result.ok) toast.error(result.error.message)
        })
      }}
    >
      <SubmitButton pending={pending} size="lg" className="w-full">
        Unirme al equipo
      </SubmitButton>
    </form>
  )
}
