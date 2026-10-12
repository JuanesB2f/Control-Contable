"use client"

import { useState } from "react"
import { toast } from "sonner"

import { useInstallApp } from "./install-app"
import { InstallAppDialog } from "./install-app-dialog"

/** One entry point for "Instalar app": native prompt when the browser offers it, instructions otherwise. */
export function useInstallFlow() {
  const { platform, promptInstall } = useInstallApp()
  const [helpOpen, setHelpOpen] = useState(false)

  const start = async () => {
    if (platform !== "prompt") {
      setHelpOpen(true)
      return
    }
    if (await promptInstall()) toast.success("VitaEsme quedó instalada en tu pantalla de inicio")
  }

  const dialog =
    platform === "ios" || platform === "manual" ? <InstallAppDialog platform={platform} open={helpOpen} onOpenChange={setHelpOpen} /> : null

  return { available: platform !== "installed", start, dialog }
}
