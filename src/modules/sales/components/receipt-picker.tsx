"use client"

import { ImagePlus, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"

export type PickedReceipt = { file: File; preview: string }

/** Optional receipt photo, chosen before saving and uploaded right after the payment exists. */
export function ReceiptPicker({ value, onChange }: { value: PickedReceipt | null; onChange: (value: PickedReceipt | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!value) return
    return () => URL.revokeObjectURL(value.preview)
  }, [value])

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-2">
          <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image src={value.preview} alt="Comprobante elegido" fill sizes="56px" className="object-cover" unoptimized />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Comprobante listo</p>
            <p className="truncate text-xs text-muted-foreground">Se guarda junto con el pago.</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar comprobante" onClick={() => onChange(null)}>
            <X />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => inputRef.current?.click()}>
          <ImagePlus data-icon="inline-start" />
          Adjuntar comprobante
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) onChange({ file, preview: URL.createObjectURL(file) })
        }}
      />
    </div>
  )
}
