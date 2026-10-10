import { Monitor, Moon, Sun } from "lucide-react"

export const THEME_OPTIONS = [
  { value: "light", label: "Clara", icon: Sun },
  { value: "dark", label: "Oscura", icon: Moon },
  { value: "system", label: "Automática", icon: Monitor },
] as const

/** Browser and status bar color per theme; must equal `--background` in globals.css so the top edge blends in. */
export const THEME_COLORS = { light: "#ffffff", dark: "#121612" } as const
