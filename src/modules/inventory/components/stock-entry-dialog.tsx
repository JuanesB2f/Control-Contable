"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight } from "lucide-react"
import { useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

import { FormTextField } from "@/components/forms/form-text-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { useOrgFormat } from "@/hooks/use-org-format"
import { applyActionError } from "@/lib/forms"
import { parseDecimal } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useOrg } from "@/modules/access/components/org-provider"
import { ProductImage } from "@/modules/products/components/product-image"
import type { Product } from "@/modules/products/domain/types"

import { adjustStock, recordPurchase } from "../application/actions"
import { adjustmentSchema, purchaseSchema } from "../domain/schemas"
import { weightedAverageCost } from "../domain/stock"

export type StockEntryMode = "purchase" | "adjustment"

type StockEntryDialogProps = {
  product: Product | null
  mode: StockEntryMode
  onOpenChange: (open: boolean) => void
}

export function StockEntryDialog({ product, mode, onOpenChange }: StockEntryDialogProps) {
  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {product ? (
          mode === "purchase" ? (
            <PurchaseForm product={product} onDone={() => onOpenChange(false)} />
          ) : (
            <AdjustmentForm product={product} onDone={() => onOpenChange(false)} />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type PreviewRow = { label: string; from?: string; to: string; highlight?: boolean }

function Preview({ rows }: { rows: PreviewRow[] }) {
  return (
    <dl className="grid gap-2 rounded-2xl bg-muted/60 p-4">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="flex items-center gap-1.5 font-medium tabular-nums">
            {row.from ? (
              <>
                <span className="text-muted-foreground">{row.from}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </>
            ) : null}
            <span className={cn(row.highlight && "text-primary")}>{row.to}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

type PurchaseFormInput = z.input<typeof purchaseSchema>
type PurchaseFormValues = z.output<typeof purchaseSchema>

function PurchaseForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const { organization } = useOrg()
  const format = useOrgFormat()
  const [pending, startTransition] = useTransition()
  const form = useForm<PurchaseFormInput, unknown, PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      productId: product.id,
      quantity: "",
      unitCost: product.costPrice !== null ? String(product.costPrice) : "",
      note: "",
    },
  })
  const [quantityInput, unitCostInput] = useWatch({ control: form.control, name: ["quantity", "unitCost"] })
  const quantity = parseDecimal(quantityInput)
  const unitCost = parseDecimal(unitCostInput)
  const validQuantity = Number.isInteger(quantity) && quantity > 0

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await recordPurchase(organization.slug, values)
      if (!result.ok) {
        applyActionError(form, result.error)
        return
      }
      toast.success(`Ahora tienes ${format.number(result.data.stock)} unidades de ${product.name}`)
      onDone()
    }),
  )

  const previewRows: PreviewRow[] = validQuantity
    ? [
        { label: "Unidades", from: format.number(product.stock), to: format.number(product.stock + quantity), highlight: true },
        ...(product.costPrice !== null && Number.isFinite(unitCost)
          ? [
              {
                label: "Costo promedio",
                from: format.money(product.costPrice),
                to: format.money(weightedAverageCost(product.stock, product.costPrice, quantity, unitCost)),
              },
              { label: "Total de la compra", to: format.money(quantity * unitCost) },
            ]
          : []),
      ]
    : []

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <DialogHeader>
        <ProductImage name={product.name} url={product.imageUrl} className="mb-1 size-14 rounded-2xl" sizes="56px" />
        <DialogTitle className="text-[17px] font-semibold">Registrar compra</DialogTitle>
        <DialogDescription className="text-pretty">
          Entró mercancía de <span className="font-medium text-foreground">{product.name}</span>. El costo se promedia con lo que ya tienes.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={form.control} name="quantity" label="Unidades compradas" inputMode="numeric" autoFocus />
        <FormTextField control={form.control} name="unitCost" label="Costo por unidad" prefix="$" inputMode="decimal" />
        <div className="sm:col-span-2">
          <FormTextField control={form.control} name="note" label="Nota (opcional)" placeholder="Proveedor, factura…" />
        </div>
      </FieldGroup>
      {previewRows.length > 0 ? <Preview rows={previewRows} /> : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending}>Registrar compra</SubmitButton>
      </DialogFooter>
    </form>
  )
}

type AdjustmentFormInput = z.input<typeof adjustmentSchema>
type AdjustmentFormValues = z.output<typeof adjustmentSchema>

function AdjustmentForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const { organization } = useOrg()
  const format = useOrgFormat()
  const [pending, startTransition] = useTransition()
  const form = useForm<AdjustmentFormInput, unknown, AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { productId: product.id, countedStock: String(product.stock), note: "" },
  })
  const counted = parseDecimal(useWatch({ control: form.control, name: "countedStock" }))
  const difference = Number.isInteger(counted) ? counted - product.stock : 0

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await adjustStock(organization.slug, values)
      if (!result.ok) {
        applyActionError(form, result.error)
        return
      }
      toast.success(`Inventario de ${product.name} ajustado a ${format.number(result.data.stock)} unidades`)
      onDone()
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <DialogHeader>
        <ProductImage name={product.name} url={product.imageUrl} className="mb-1 size-14 rounded-2xl" sizes="56px" />
        <DialogTitle className="text-[17px] font-semibold">Ajustar conteo</DialogTitle>
        <DialogDescription className="text-pretty">
          Cuenta las unidades de <span className="font-medium text-foreground">{product.name}</span> y escribe lo que hay realmente.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <FormTextField control={form.control} name="countedStock" label="Unidades contadas" inputMode="numeric" autoFocus />
        <FormTextField control={form.control} name="note" label="Motivo" placeholder="Producto vencido, daño, conteo…" />
      </FieldGroup>
      {difference !== 0 ? (
        <div
          className={cn(
            "rounded-2xl p-4 text-sm",
            difference > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          <p className="font-semibold">
            {difference > 0 ? "Sobran" : "Faltan"} {format.number(Math.abs(difference))} {Math.abs(difference) === 1 ? "unidad" : "unidades"}
          </p>
          {product.costPrice !== null ? (
            <p className="mt-0.5 opacity-80">
              {difference > 0 ? "Equivalen a" : "Pérdida de"} {format.money(Math.abs(difference) * product.costPrice)} al costo
            </p>
          ) : null}
        </div>
      ) : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} disabled={difference === 0}>
          Guardar ajuste
        </SubmitButton>
      </DialogFooter>
    </form>
  )
}
