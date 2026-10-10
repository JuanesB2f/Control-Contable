"use client"

import { HandCoins, Mail, MessageCircle, Pencil, Phone, Star, Trash2 } from "lucide-react"
import Link from "next/link"
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
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { routes } from "@/config/routes"
import { useOrgFormat } from "@/hooks/use-org-format"
import { useCan, useOrg } from "@/modules/access/components/org-provider"

import { deleteCustomer } from "../application/actions"
import { whatsappUrl } from "../domain/contact"
import { SEGMENT_INFO } from "../domain/segments"
import type { CustomerRow } from "./customers-view"
import { SegmentBadge } from "./segment-badge"

type CustomerDetailSheetProps = {
  customer: CustomerRow | null
  onOpenChange: (open: boolean) => void
  onEdit: (customer: CustomerRow) => void
}

export function CustomerDetailSheet({ customer, onOpenChange, onEdit }: CustomerDetailSheetProps) {
  return (
    <Sheet open={customer !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {customer ? <CustomerDetail customer={customer} onEdit={onEdit} onDeleted={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function CustomerDetail({
  customer,
  onEdit,
  onDeleted,
}: {
  customer: CustomerRow
  onEdit: (customer: CustomerRow) => void
  onDeleted: () => void
}) {
  const { organization } = useOrg()
  const can = useCan()
  const format = useOrgFormat()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const whatsapp = whatsappUrl(customer.phone, organization.country)
  const averageTicket = customer.orders > 0 ? customer.totalSpent / customer.orders : 0

  const remove = () =>
    startTransition(async () => {
      const result = await deleteCustomer(organization.slug, customer.id)
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success(`${customer.name} eliminado`)
      setConfirmOpen(false)
      onDeleted()
    })

  const stats = [
    { label: "Compras", value: format.number(customer.orders) },
    { label: "Total comprado", value: format.money(customer.totalSpent) },
    { label: "Ticket promedio", value: customer.orders > 0 ? format.money(averageTicket) : "—" },
    { label: "Última compra", value: customer.lastPurchaseLabel ?? "—" },
  ]

  return (
    <>
      <SheetHeader className="items-center gap-2 border-b px-5 pt-8 pb-5 text-center">
        <UserAvatar name={customer.name} className="size-16 **:data-[slot=avatar-fallback]:text-lg" />
        <SheetTitle className="text-lg font-semibold">{customer.name}</SheetTitle>
        <SegmentBadge segment={customer.segment} />
        <SheetDescription className="text-xs">{SEGMENT_INFO[customer.segment].description}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 p-5">
        {whatsapp || customer.phone || customer.email ? (
          <div className="grid grid-cols-3 gap-2">
            {whatsapp ? (
              <ContactButton href={whatsapp} icon={MessageCircle} label="WhatsApp" external />
            ) : null}
            {customer.phone ? <ContactButton href={`tel:${customer.phone}`} icon={Phone} label="Llamar" /> : null}
            {customer.email ? <ContactButton href={`mailto:${customer.email}`} icon={Mail} label="Correo" /> : null}
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border/70">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card p-3.5">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-0.5 truncate text-base font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {customer.balanceDue > 0 ? (
          <Link
            href={routes.org.sales(organization.slug)}
            className="flex items-center gap-3 rounded-2xl bg-warning/10 p-3.5 transition-colors hover:bg-warning/15"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <HandCoins className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Te debe</p>
              <p className="text-base font-semibold tabular-nums">{format.money(customer.balanceDue)}</p>
            </div>
            <span className="ml-auto text-xs text-muted-foreground">Ventas › Por cobrar</span>
          </Link>
        ) : null}

        {customer.favoriteProduct ? (
          <div className="flex items-center gap-3 rounded-2xl bg-primary/6 p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Star className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Su producto favorito</p>
              <p className="truncate text-sm font-medium">{customer.favoriteProduct}</p>
            </div>
          </div>
        ) : null}

        <dl className="grid gap-3 text-sm">
          {customer.phone ? <DetailRow label="Teléfono" value={customer.phone} /> : null}
          {customer.email ? <DetailRow label="Correo" value={customer.email} /> : null}
          {customer.document ? <DetailRow label="Documento" value={customer.document} /> : null}
          <DetailRow label="Cliente desde" value={customer.sinceLabel} />
        </dl>

        {customer.notes ? (
          <div className="rounded-2xl border p-3.5">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="mt-1 text-sm whitespace-pre-line">{customer.notes}</p>
          </div>
        ) : null}

        {can("customers.write") ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onEdit(customer)}>
              <Pencil data-icon="inline-start" />
              Editar
            </Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 data-icon="inline-start" />
              Eliminar
            </Button>
          </div>
        ) : null}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {customer.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {customer.orders > 0
                ? `Sus ${customer.orders} ventas se conservan, pero quedarán sin cliente asignado.`
                : "Esta acción no se puede deshacer."}
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
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ContactButton({
  href,
  icon: Icon,
  label,
  external,
}: {
  href: string
  icon: typeof Phone
  label: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex flex-col items-center gap-1 rounded-2xl bg-muted/70 px-2 py-3 text-xs font-medium text-primary transition-colors hover:bg-muted"
    >
      <Icon className="size-4.5" />
      {label}
    </a>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  )
}
