import { cn } from "@/lib/utils"

/** App icon: a squircle with three rising bars, legible from 16px to 64px. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-[28%] bg-linear-to-b from-[#2b8cff] to-[#0061d5] shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.15)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[58%] text-white">
        <rect x="4" y="12" width="4" height="8" rx="1.6" fill="currentColor" opacity="0.7" />
        <rect x="10" y="8" width="4" height="12" rx="1.6" fill="currentColor" opacity="0.85" />
        <rect x="16" y="4" width="4" height="16" rx="1.6" fill="currentColor" />
      </svg>
    </span>
  )
}
