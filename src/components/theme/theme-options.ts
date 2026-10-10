import { Monitor, Moon, Sun } from "lucide-react"

export const THEME_OPTIONS = [
  { value: "light", label: "Clara", icon: Sun },
  { value: "dark", label: "Oscura", icon: Moon },
  { value: "system", label: "Automática", icon: Monitor },
] as const
