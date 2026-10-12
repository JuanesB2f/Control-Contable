"use client"

import { EllipsisVertical, Share, SquarePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import type { InstallPlatform } from "./install-app"

const STEPS = {
  ios: [
    { icon: Share, text: "Toca el botón Compartir de Safari (el cuadro con la flecha hacia arriba)." },
    { icon: SquarePlus, text: "Elige “Agregar a inicio” y luego “Agregar”." },
  ],
  manual: [
    { icon: EllipsisVertical, text: "Abre el menú del navegador (los tres puntos ⋮ arriba a la derecha)." },
    { icon: SquarePlus, text: "Toca “Instalar app” o “Agregar a pantalla de inicio”." },
  ],
} as const

/** Step-by-step for browsers without a native install prompt. */
export function InstallAppDialog({
  platform,
  open,
  onOpenChange,
}: {
  platform: Extract<InstallPlatform, "ios" | "manual">
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold">Instalar VitaEsme</DialogTitle>
          <DialogDescription>Queda como una app en tu pantalla de inicio, a pantalla completa.</DialogDescription>
        </DialogHeader>
        <ol className="grid gap-3">
          {STEPS[platform].map((step, index) => (
            <li key={step.text} className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3 text-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                <step.icon className="size-4" />
              </span>
              <span className="pt-1.5">
                <span className="font-semibold">{index + 1}.</span> {step.text}
              </span>
            </li>
          ))}
        </ol>
        {platform === "manual" ? (
          <p className="text-[13px] text-muted-foreground text-pretty">
            En tablets y celulares Android funciona mejor desde Google Chrome. Si no ves la opción, actualiza Chrome y recarga la página.
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
