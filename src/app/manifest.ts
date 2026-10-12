import type { MetadataRoute } from "next"

import { THEME_COLORS } from "@/components/theme/theme-options"
import { siteConfig } from "@/config/site"

/** Installable on phones, tablets (any orientation) and desktop. Chrome needs the 192/512 PNGs. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  }
}
