"use client"

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { useEffect } from "react"

import { THEME_COLORS } from "./theme-options"

/** Paints the phone's status bar with the theme chosen in the app, not just the system one. */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const color = resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = color
    }
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  )
}
