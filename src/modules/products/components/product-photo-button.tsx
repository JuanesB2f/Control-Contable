"use client"

import { Camera, Loader2 } from "lucide-react"
import { useRef } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useCan } from "@/modules/access/components/org-provider"

import type { Product } from "../domain/types"
import { ProductImage } from "./product-image"
import { useProductPhoto } from "./use-product-photo"

/** Product thumbnail that opens the camera / gallery to set its photo, for users who can edit products. */
export function ProductPhotoButton({ product, className }: { product: Product; className?: string }) {
  const can = useCan()
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, pending } = useProductPhoto()

  if (!can("products.write")) return <ProductImage name={product.name} url={product.imageUrl} className={className} />

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label={product.imageUrl ? `Cambiar la foto de ${product.name}` : `Agregar foto a ${product.name}`}
        className={cn("group/photo relative shrink-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
      >
        <ProductImage name={product.name} url={product.imageUrl} className="size-full" />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 text-white transition-opacity",
            pending ? "opacity-100" : "opacity-0 group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100",
          )}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </span>
        {!product.imageUrl && !pending ? (
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
            <Camera className="size-3" />
          </span>
        ) : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file && (await upload(product.id, file))) toast.success(`Foto de ${product.name} guardada`)
        }}
      />
    </>
  )
}
