"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Camera } from "lucide-react"
import { useEffect, useId, useRef, useState, useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

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
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { applyActionError } from "@/lib/forms"
import { parseDecimal } from "@/lib/money"
import { useOrg } from "@/modules/access/components/org-provider"

import { createProduct, updateProduct } from "../application/actions"
import { createProductSchema } from "../domain/schemas"
import type { Product } from "../domain/types"
import { PriceSimulator } from "./price-simulator"
import { ProductImage } from "./product-image"
import { useProductPhoto } from "./use-product-photo"

const productFormSchema = createProductSchema.extend({ isActive: z.boolean() })
type ProductFormInput = z.input<typeof productFormSchema>
type ProductFormValues = z.output<typeof productFormSchema>

function defaultsFrom(product: Product | null): ProductFormInput {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category: product?.category ?? "",
    costPrice: product?.costPrice != null ? String(product.costPrice) : "",
    salePrice: product ? String(product.salePrice) : "",
    minStock: product ? String(product.minStock) : "0",
    initialStock: "0",
    isActive: product?.isActive ?? true,
  }
}

type ProductFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Null to create a new product. */
  product: Product | null
  categories: string[]
}

export function ProductFormDialog({ open, onOpenChange, product, categories }: ProductFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        {open ? <ProductForm product={product} categories={categories} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ProductForm({ product, categories, onDone }: { product: Product | null; categories: string[]; onDone: () => void }) {
  const { organization } = useOrg()
  const [pending, startTransition] = useTransition()
  const categoryListId = useId()
  const isEditing = product !== null

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const productPhoto = useProductPhoto()
  const photoUrl = photo?.preview ?? (photoRemoved ? null : (product?.imageUrl ?? null))

  useEffect(() => {
    if (!photo) return
    return () => URL.revokeObjectURL(photo.preview)
  }, [photo])

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultsFrom(product),
  })
  const [name, cost, price] = useWatch({ control: form.control, name: ["name", "costPrice", "salePrice"] })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      let productId: string
      if (isEditing) {
        const result = await updateProduct(organization.slug, { ...values, productId: product.id })
        if (!result.ok) {
          applyActionError(form, result.error)
          return
        }
        productId = product.id
      } else {
        const result = await createProduct(organization.slug, values)
        if (!result.ok) {
          applyActionError(form, result.error)
          return
        }
        productId = result.data.id
      }

      if (photo) await productPhoto.upload(productId, photo.file)
      else if (photoRemoved && product?.imageUrl) await productPhoto.remove(productId)

      toast.success(isEditing ? "Producto actualizado" : `${values.name} agregado al catálogo`)
      onDone()
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="text-[17px] font-semibold">{isEditing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Los cambios de precio aplican a las próximas ventas."
            : "Registra en cuánto lo compras y en cuánto lo vendes para conocer tu ganancia real."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-4">
        <ProductImage name={name || "?"} url={photoUrl} className="size-20 rounded-2xl text-2xl" sizes="80px" />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-medium">Foto del producto</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={pending}>
              <Camera data-icon="inline-start" />
              {photoUrl ? "Cambiar" : "Agregar foto"}
            </Button>
            {photoUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setPhoto(null)
                  setPhotoRemoved(true)
                }}
              >
                Quitar
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">Opcional. La verás en inventario y al vender.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            setPhoto({ file, preview: URL.createObjectURL(file) })
            setPhotoRemoved(false)
          }}
        />
      </div>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormTextField control={form.control} name="name" label="Nombre" placeholder="Colágeno hidrolizado 500 g" autoFocus />
        </div>
        <FormTextField control={form.control} name="category" label="Categoría" placeholder="Vitaminas" list={categoryListId} />
        <datalist id={categoryListId}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <FormTextField control={form.control} name="sku" label="Código (opcional)" placeholder="COL-500" />
        <FormTextField
          control={form.control}
          name="costPrice"
          label="¿En cuánto lo compras?"
          prefix="$"
          inputMode="decimal"
          placeholder="0"
          description={isEditing ? "Costo promedio; se recalcula con cada compra." : "Costo por unidad."}
        />
        <FormTextField
          control={form.control}
          name="salePrice"
          label="¿En cuánto lo vendes?"
          prefix="$"
          inputMode="decimal"
          placeholder="0"
        />
      </FieldGroup>

      <PriceSimulator
        cost={parseDecimal(cost)}
        price={parseDecimal(price)}
        onApplyPrice={(value) => form.setValue("salePrice", String(value), { shouldDirty: true, shouldValidate: true })}
      />

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        {isEditing ? null : (
          <FormTextField
            control={form.control}
            name="initialStock"
            label="Unidades que tienes hoy"
            inputMode="numeric"
            description="Se registra como inventario inicial."
          />
        )}
        <FormTextField
          control={form.control}
          name="minStock"
          label="Avisarme cuando queden"
          inputMode="numeric"
          description="Stock mínimo antes de reabastecer."
        />
        {isEditing ? (
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Field orientation="horizontal" className="rounded-xl border px-3.5 py-3 sm:col-span-2">
                <FieldContent>
                  <FieldLabel htmlFor="product-active">Disponible para la venta</FieldLabel>
                  <FieldDescription>Desactívalo si ya no lo vendes. Su historial se conserva.</FieldDescription>
                </FieldContent>
                <Switch id="product-active" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
        ) : null}
      </FieldGroup>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending}>{isEditing ? "Guardar cambios" : "Agregar producto"}</SubmitButton>
      </DialogFooter>
    </form>
  )
}
