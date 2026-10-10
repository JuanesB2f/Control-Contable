import { useId } from "react"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

/** VitaEsme mark: two leaves with a golden star inside an open ring. Scales from 16px upwards. */
export function BrandMark({ className }: { className?: string }) {
  const id = useId()
  const dark = `${id}-dark`
  const light = `${id}-light`

  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id={dark} x1="18" y1="16" x2="34" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2e7d32" />
          <stop offset="1" stopColor="#1b5e20" />
        </linearGradient>
        <linearGradient id={light} x1="46" y1="16" x2="32" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#81c784" />
          <stop offset="1" stopColor="#4caf50" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" stroke="#66bb6a" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="150 26" transform="rotate(-62 32 32)" />
      <circle cx="54" cy="16" r="3.6" fill="#fbc02d" />
      <circle cx="9.5" cy="41" r="2.4" fill="#fbc02d" />
      <path d="M31.2 50C19 45.5 14.5 28.5 28.6 13.5C31 25 31.6 37 31.2 50Z" fill={`url(#${dark})`} />
      <path d="M32.8 50C45 45.5 49.5 28.5 35.4 13.5C33 25 32.4 37 32.8 50Z" fill={`url(#${light})`} />
      <path
        d="M32 23.5L33.9 27.8L38.5 28.2L35 31.2L36.1 35.7L32 33.3L27.9 35.7L29 31.2L25.5 28.2L30.1 27.8Z"
        fill="#fbc02d"
      />
    </svg>
  )
}

/** App icon: the brand mark on a white squircle, legible on light and dark surfaces. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[28%] bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_3px_rgb(0_0_0/0.12)]",
        className,
      )}
    >
      <BrandMark className="size-[84%]" />
    </span>
  )
}

/** Full lockup used on public screens: icon, name and tagline. */
export function BrandLockup() {
  return (
    <span className="flex flex-col items-center gap-3">
      <AppLogo className="size-16" />
      <span className="flex flex-col items-center gap-0.5">
        <span className="text-2xl font-semibold tracking-tight text-brand">{siteConfig.name}</span>
        <span className="text-[11px] font-medium tracking-[0.28em] text-brand-light uppercase">{siteConfig.tagline}</span>
      </span>
    </span>
  )
}
