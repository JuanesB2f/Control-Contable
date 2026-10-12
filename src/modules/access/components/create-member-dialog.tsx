"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Copy, Dices, Eye, EyeOff, UserRoundCheck, UserRoundPlus } from "lucide-react"
import { useId, useState, useTransition } from "react"
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { routes } from "@/config/routes"
import { applyActionError } from "@/lib/forms"

import { createMemberAccount } from "../application/actions"
import { ROLE_LABELS } from "../domain/permissions"
import { createMemberAccountSchema, type CreateMemberAccountInput } from "../domain/schemas"
import { useOrg } from "./org-provider"
import { RoleField } from "./role-field"

const EMPTY_FORM: CreateMemberAccountInput = { fullName: "", email: "", password: "", role: "employee" }

const LETTERS = "abcdefghjkmnpqrstuvwxyz"
const DIGITS = "23456789"

/** Easy to dictate: no look-alike characters, always letters and numbers. */
function generatePassword() {
  const random = crypto.getRandomValues(new Uint32Array(10))
  const pick = (alphabet: string, value: number) => alphabet[value % alphabet.length]
  const letters = Array.from(random.slice(0, 6), (value) => pick(LETTERS, value)).join("")
  const digits = Array.from(random.slice(6), (value) => pick(DIGITS, value)).join("")
  return `${letters.charAt(0).toUpperCase()}${letters.slice(1)}${digits}`
}

type CreatedAccount = { fullName: string; email: string; password: string; role: CreateMemberAccountInput["role"] }

function AccountCreated({ account, onCreateAnother }: { account: CreatedAccount; onCreateAnother: () => void }) {
  const [copied, setCopied] = useState(false)
  const loginUrl = `${window.location.origin}${routes.login}`
  const credentials = `Entra a ${loginUrl}\nCorreo: ${account.email}\nContraseña: ${account.password}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credentials)
      setCopied(true)
      toast.success("Datos copiados")
    } catch {
      toast.error("No pudimos copiar. Selecciona el texto y cópialo manualmente.")
    }
  }

  return (
    <>
      <DialogHeader className="items-center text-center">
        <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <UserRoundCheck className="size-6" />
        </span>
        <DialogTitle className="text-[17px] font-semibold">Cuenta lista</DialogTitle>
        <DialogDescription className="text-pretty">
          {account.fullName} ya puede entrar como {ROLE_LABELS[account.role]}. Compártele estos datos; podrá cambiar la contraseña
          desde su perfil.
        </DialogDescription>
      </DialogHeader>
      <dl className="grid gap-2 rounded-2xl bg-muted/60 p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Correo</dt>
          <dd className="truncate font-medium">{account.email}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Contraseña</dt>
          <dd className="font-mono font-medium select-all">{account.password}</dd>
        </div>
      </dl>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCreateAnother}>
          Crear otro usuario
        </Button>
        <Button type="button" onClick={copy}>
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          Copiar datos
        </Button>
      </DialogFooter>
    </>
  )
}

/** Creates a ready-to-use login for a teammate, without email confirmation or invitation links. */
export function CreateMemberDialog() {
  const { organization } = useOrg()
  const passwordId = useId()
  const [open, setOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(true)
  const [created, setCreated] = useState<CreatedAccount | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<CreateMemberAccountInput>({
    resolver: zodResolver(createMemberAccountSchema),
    defaultValues: EMPTY_FORM,
  })

  const reset = () => {
    form.reset(EMPTY_FORM)
    setCreated(null)
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await createMemberAccount(organization.slug, values)
      if (!result.ok) {
        applyActionError(form, result.error)
        return
      }
      setCreated(values)
      toast.success(`${values.fullName} ya tiene acceso`)
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <UserRoundPlus data-icon="inline-start" />
          Crear usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <AccountCreated account={created} onCreateAnother={reset} />
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle className="text-[17px] font-semibold">Crear usuario</DialogTitle>
              <DialogDescription>Le creas el acceso a {organization.name} y entra de inmediato, sin confirmar correo.</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <FormTextField control={form.control} name="fullName" label="Nombre" autoComplete="off" placeholder="Ej. Laura Gómez" autoFocus />
              <FormTextField
                control={form.control}
                name="email"
                label="Correo con el que entrará"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="nombre@correo.com"
              />
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={passwordId}>Contraseña</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id={passwordId}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        autoCapitalize="none"
                        spellCheck={false}
                        aria-invalid={fieldState.invalid}
                        placeholder="Mínimo 8, con letras y números"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          onClick={() => setShowPassword((value) => !value)}
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                        <InputGroupButton
                          onClick={() => {
                            setShowPassword(true)
                            form.setValue("password", generatePassword(), { shouldValidate: true })
                          }}
                        >
                          <Dices />
                          Generar
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : (
                      <FieldDescription>Podrá cambiarla después desde su perfil.</FieldDescription>
                    )}
                  </Field>
                )}
              />
              <RoleField control={form.control} name="role" />
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <SubmitButton pending={pending}>Crear usuario</SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
