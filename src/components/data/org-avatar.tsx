import { cn } from "@/lib/utils"

import { initialsOf } from "./user-avatar"

const PALETTE = [
  "from-[#5ac8fa] to-[#007aff]",
  "from-[#34c759] to-[#248a3d]",
  "from-[#ff9f0a] to-[#ff6b00]",
  "from-[#af52de] to-[#8944ab]",
  "from-[#ff375f] to-[#d70039]",
  "from-[#64d2ff] to-[#30b0c7]",
  "from-[#ffd60a] to-[#ff9f0a]",
] as const

function paletteFor(seed: string) {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

/** Squircle with the organization's initials and a stable color derived from its id. */
export function OrgAvatar({ name, seed, className }: { name: string; seed: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[28%] bg-linear-to-b text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]",
        paletteFor(seed),
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
