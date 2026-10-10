/** Images are resized in the browser first; this cap stays below the Server Action body limit. */
export const MAX_UPLOAD_IMAGE_BYTES = 900 * 1024

export type UploadImageType = "image/webp" | "image/jpeg" | "image/png"

export const IMAGE_EXTENSIONS: Record<UploadImageType, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte)

/** Reads the real format from the file header, ignoring the name and the declared type. */
export function detectImageType(bytes: Uint8Array): UploadImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg"
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp"
  return null
}

/** Checks size and real format of an uploaded image. Returns its type, or null when it must be rejected. */
export async function inspectUploadedImage(file: Blob): Promise<UploadImageType | null> {
  if (file.size === 0 || file.size > MAX_UPLOAD_IMAGE_BYTES) return null
  return detectImageType(new Uint8Array(await file.slice(0, 16).arrayBuffer()))
}

/** Scales `width × height` down so its longest side is at most `max`, keeping the aspect ratio. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
