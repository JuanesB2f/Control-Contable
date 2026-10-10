"use client"

import { ImageReadBlockedError, compressImage } from "@/lib/compress-image"
import { useOrg } from "@/modules/access/components/org-provider"

import { attachPaymentReceipt } from "../application/actions"
import { RECEIPT_MAX_SIDE } from "../domain/payments"

/** Compresses a receipt photo and attaches it to a payment. Resolves to an error message, or null on success. */
export function useReceiptUpload() {
  const { organization } = useOrg()

  return async (paymentId: string, file: File): Promise<string | null> => {
    let receipt: Blob
    try {
      receipt = await compressImage(file, RECEIPT_MAX_SIDE)
    } catch (error) {
      return error instanceof ImageReadBlockedError
        ? "Tu navegador bloqueó la lectura de la imagen por privacidad. Prueba con una captura de menos de 900 KB o desde otro navegador."
        : "No pudimos leer esa imagen. Prueba con una captura JPG o PNG."
    }
    const formData = new FormData()
    formData.set("paymentId", paymentId)
    formData.set("receipt", receipt, "receipt")
    const result = await attachPaymentReceipt(organization.slug, formData)
    return result.ok ? null : result.error.message
  }
}
