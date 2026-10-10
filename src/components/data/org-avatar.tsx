import { cn } from "@/lib/utils"

import { initialsOf } from "./user-avatar"

const PALETTE = [
  "from-[#4caf50] to-[#2e7d32]",
  "from-[#66bb6a] to-[#388e3c]",
  "from-[#2e7d32] to-[#1b5e20]",
  "from-[#81c784] to-[#43a047]",
  "from-[#26a69a] to-[#00796b]",
  "from-[#9ccc65] to-[#558b2f]",
  "from-[#fbc02d] to-[#f9a825]",
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
