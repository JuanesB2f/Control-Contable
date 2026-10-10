"use client"

import gsap from "gsap"
import { useLayoutEffect, useRef } from "react"

import { useOrgFormat } from "@/hooks/use-org-format"

/** A money amount or count that rolls up to its value, and from the old value whenever it changes. */
export function AnimatedNumber({ value, kind }: { value: number; kind: "money" | "number" }) {
  const format = useOrgFormat()
  const ref = useRef<HTMLSpanElement>(null)
  const shownRef = useRef(0)
  const formatValue = kind === "money" ? format.money : format.number

  useLayoutEffect(() => {
    const textNode = ref.current?.firstChild
    if (!textNode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = value
      return
    }
    const counter = { value: shownRef.current }
    const tween = gsap.to(counter, {
      value,
      duration: 0.9,
      ease: "power2.out",
      onUpdate: () => {
        shownRef.current = counter.value
        textNode.nodeValue = formatValue(Math.round(counter.value))
      },
      onComplete: () => {
        textNode.nodeValue = formatValue(value)
      },
    })
    return () => {
      tween.kill()
      textNode.nodeValue = formatValue(value)
    }
  }, [value, formatValue])

  return <span ref={ref}>{formatValue(value)}</span>
}
