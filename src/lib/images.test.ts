import { describe, expect, it } from "vitest"

import { MAX_UPLOAD_IMAGE_BYTES, detectImageType, fitWithin, inspectUploadedImage } from "./images"

const bytes = (...values: number[]) => new Uint8Array(values)

describe("detectImageType", () => {
  it("recognizes jpeg, png and webp by their headers", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg")
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png")
    expect(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp")
  })

  it("rejects anything else, even if it claims to be an image", () => {
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull()
    expect(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20))).toBeNull()
  })
})

describe("inspectUploadedImage", () => {
  it("accepts real images within the size limit", async () => {
    expect(await inspectUploadedImage(new Blob([bytes(0xff, 0xd8, 0xff, 0xe0)]))).toBe("image/jpeg")
  })

  it("rejects empty, oversized or disguised files", async () => {
    expect(await inspectUploadedImage(new Blob([]))).toBeNull()
    expect(await inspectUploadedImage(new Blob([new Uint8Array(MAX_UPLOAD_IMAGE_BYTES + 1).fill(0xff)]))).toBeNull()
    expect(await inspectUploadedImage(new Blob(["%PDF-1.7"], { type: "image/png" }))).toBeNull()
  })
})

describe("fitWithin", () => {
  it("scales the longest side down", () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 })
    expect(fitWithin(1000, 2000, 1024)).toEqual({ width: 512, height: 1024 })
  })

  it("never upscales", () => {
    expect(fitWithin(300, 200, 1024)).toEqual({ width: 300, height: 200 })
  })
})
