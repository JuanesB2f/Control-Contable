"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Copy, MailCheck, UserPlus } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FieldError, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { applyActionError } from "@/lib/forms"
import { cn } from "@/lib/utils"

import { inviteMember } from "../application/actions"
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "../domain/permissions"
import { inviteMemberSchema, type InviteMemberInput } from "../domain/schemas"
import { useOrg } from "./org-provider"

type SentInvitation = { email: string; inviteUrl: string; emailSent: boolean }

const EMPTY_FORM: InviteMemberInput = { email: "", role: "employee" }

function InvitationSent({ invitation, onInviteAnother }: { invitation: SentInvitation; onInviteAnother: () => void }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invitation.inviteUrl)
      setCopied(true)
      toast.success("Enlace copiado")
    } catch {
      toast.error("No pudimos copiar el enlace. Selecciónalo y cópialo manualmente.")
    }
  }

  return (
    <>
      <DialogHeader className="items-center text-center">
        <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheck className="size-6" />
        </span>
        <DialogTitle className="text-[17px] font-semibold">Invitación creada</DialogTitle>
        <DialogDescription className="text-pretty">
          {invitation.emailSent
            ? `Le enviamos un correo a ${invitation.email}. También puedes compartirle este enlace.`
            : `Comparte este enlace con ${invitation.email}. Es personal, de un solo uso y vence en 7 días.`}
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-2">
        <Input readOnly value={invitation.inviteUrl} aria-label="Enlace de invitación" onFocus={(event) => event.currentTarget.select()} />
        <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" onClick={copy} aria-label="Copiar enlace">
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onInviteAnother}>
          Invitar a otra persona
        </Button>
      </DialogFooter>
    </>
  )
}

export function InviteMemberDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { organization } = useOrg()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(defaultOpen)
  const [sent, setSent] = useState<SentInvitation | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: EMPTY_FORM,
  })

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) return
    form.reset(EMPTY_FORM)
    setSent(null)
    if (defaultOpen) router.replace(pathname, { scroll: false })
  }

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await inviteMember(organization.slug, values)
      if (!result.ok) {
        applyActionError(form, result.error)
        return
      }
      setSent({ email: values.email, ...result.data })
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <UserPlus data-icon="inline-start" />
          Invitar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <InvitationSent
            invitation={sent}
            onInviteAnother={() => {
              form.reset(EMPTY_FORM)
              setSent(null)
            }}
          />
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle className="text-[17px] font-semibold">Invitar a {organization.name}</DialogTitle>
              <DialogDescription>Recibirá un enlace para unirse con su propia cuenta.</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <FormTextField
                control={form.control}
                name="email"
                label="Correo electrónico"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="nombre@correo.com"
                autoFocus
              />
              <Controller
                control={form.control}
                name="role"
                render={({ field, fieldState }) => (
                  <FieldSet data-invalid={fieldState.invalid} className="gap-2">
                    <FieldLegend variant="label">Rol</FieldLegend>
                    <div className="grid gap-2">
                      {ASSIGNABLE_ROLES.map((role) => (
                        <label
                          key={role}
                          className={cn(
                            "flex cursor-pointer gap-3 rounded-xl border bg-card px-3.5 py-3 transition-colors hover:bg-muted/50",
                            field.value === role && "border-primary bg-primary/5 ring-1 ring-primary hover:bg-primary/5",
                          )}
                        >
                          <input
                            type="radio"
                            name={field.name}
                            value={role}
                            checked={field.value === role}
                            onChange={() => field.onChange(role)}
                            onBlur={field.onBlur}
                            className="mt-0.5 size-4 accent-primary"
                          />
                          <span className="grid gap-0.5">
                            <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                            <span className="text-[13px] text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </FieldSet>
                )}
              />
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <SubmitButton pending={pending}>Enviar invitación</SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
