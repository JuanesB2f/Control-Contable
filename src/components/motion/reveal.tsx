"use client"

import gsap from "gsap"
import { useLayoutEffect, useRef } from "react"

/** Must match the delay of the `reveal-fallback` animation in globals.css. */
const FALLBACK_DELAY_MS = 600

/**
 * Fades its sections (and each item of a grid section) up into place, one after another.
 * Content stays hidden only until hydration; if that takes long, a CSS fallback shows it anyway.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const alreadyVisible = root.getAnimations().some((animation) => Number(animation.currentTime ?? 0) >= FALLBACK_DELAY_MS)
    root.dataset.revealed = ""
    if (alreadyVisible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const targets = root.querySelectorAll(":scope > :not(.grid), :scope > .grid > *")
    const context = gsap.context(() => {
      gsap.from(targets, {
        autoAlpha: 0,
        y: 18,
        scale: 0.985,
        duration: 0.6,
        ease: "power3.out",
        stagger: Math.min(0.05, 0.6 / targets.length),
        clearProps: "opacity,visibility,transform",
      })
    }, root)
    return () => context.revert()
  }, [])

  return (
    <div ref={ref} data-reveal="" className={className}>
      {children}
    </div>
  )
}
