import { MAX_UPLOAD_IMAGE_BYTES, fitWithin } from "./images"

const QUALITY_STEPS = [0.85, 0.72, 0.6, 0.45]
const UPLOADABLE_TYPES = new Set(["image/webp", "image/jpeg", "image/png"])

/** The browser handed back an empty canvas (privacy protections such as Firefox's resistFingerprinting). */
export class ImageReadBlockedError extends Error {
  constructor() {
    super("The browser blocked reading the image pixels")
    this.name = "ImageReadBlockedError"
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

const canUploadAsIs = (file: File) => UPLOADABLE_TYPES.has(file.type) && file.size <= MAX_UPLOAD_IMAGE_BYTES

/** True when every sampled pixel is identical, which is what a blocked canvas read looks like. */
function looksBlank(context: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = context.getImageData(0, 0, width, height)
  const step = Math.max(4, Math.floor(data.length / 4 / 2000)) * 4
  for (let index = step; index < data.length; index += step) {
    if (data[index] !== data[0] || data[index + 1] !== data[1] || data[index + 2] !== data[2]) return false
  }
  return true
}

/**
 * Prepares a photo for upload: files that are already light and small enough go up untouched;
 * anything else is resized so its longest side is at most `maxSide` and re-encoded as WebP
 * (JPEG where WebP encoding isn't available), lowering the quality until it fits the upload limit.
 */
export async function compressImage(file: File, maxSide: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  if (Math.max(bitmap.width, bitmap.height) <= maxSide && canUploadAsIs(file)) {
    bitmap.close()
    return file
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("Canvas 2D is not available")
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  if (looksBlank(context, width, height)) {
    if (canUploadAsIs(file)) return file
    throw new ImageReadBlockedError()
  }

  for (const quality of QUALITY_STEPS) {
    const webp = await encode(canvas, "image/webp", quality)
    const blob = webp?.type === "image/webp" ? webp : await encode(canvas, "image/jpeg", quality)
    if (blob && blob.size <= MAX_UPLOAD_IMAGE_BYTES) return blob
  }
  throw new Error("Image is too large even after compression")
}
