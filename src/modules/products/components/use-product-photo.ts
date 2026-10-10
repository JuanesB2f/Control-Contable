"use client"

import { useState } from "react"
import { toast } from "sonner"

import { ImageReadBlockedError, compressImage } from "@/lib/compress-image"
import { useOrg } from "@/modules/access/components/org-provider"

import { removeProductImage, setProductImage } from "../application/actions"
import { PRODUCT_IMAGE_MAX_SIDE } from "../domain/image"

/** Compresses and uploads product photos, reporting failures with a toast. Resolves to true on success. */
export function useProductPhoto() {
  const { organization } = useOrg()
  const [pending, setPending] = useState(false)

  const upload = async (productId: string, file: File) => {
    setPending(true)
    try {
      let photo: Blob
      try {
        photo = await compressImage(file, PRODUCT_IMAGE_MAX_SIDE)
      } catch (error) {
        toast.error(
          error instanceof ImageReadBlockedError
            ? "Tu navegador bloqueó la lectura de la imagen por privacidad. Prueba con una foto de menos de 900 KB o desde otro navegador."
            : "No pudimos leer esa imagen. Prueba con una foto JPG o PNG.",
        )
        return false
      }
      const formData = new FormData()
      formData.set("productId", productId)
      formData.set("photo", photo, "photo")
      const result = await setProductImage(organization.slug, formData)
      if (!result.ok) toast.error(result.error.message)
      return result.ok
    } finally {
      setPending(false)
    }
  }

  const remove = async (productId: string) => {
    setPending(true)
    try {
      const result = await removeProductImage(organization.slug, productId)
      if (!result.ok) toast.error(result.error.message)
      return result.ok
    } finally {
      setPending(false)
    }
  }

  return { upload, remove, pending }
}
