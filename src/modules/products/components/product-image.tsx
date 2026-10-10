import Image from "next/image"

import { cn } from "@/lib/utils"

type ProductImageProps = {
  name: string
  url: string | null
  className?: string
  /** Rendered width hint for the image optimizer, e.g. "48px". */
  sizes?: string
}

/** Product photo cropped to a square, or its initial when it has none. */
export function ProductImage({ name, url, className, sizes = "48px" }: ProductImageProps) {
  return (
    <span
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
    >
      {url ? <Image src={url} alt={name} fill sizes={sizes} className="object-cover" /> : name.slice(0, 1).toUpperCase()}
    </span>
  )
}
