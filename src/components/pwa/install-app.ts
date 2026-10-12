"use client"

import { useSyncExternalStore } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

// Chrome fires this once, early; capture it at load so the button can use it later.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    notify()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export type InstallPlatform = "installed" | "prompt" | "ios" | "manual"

function currentPlatform(): InstallPlatform {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true)
  if (standalone) return "installed"
  if (deferredPrompt) return "prompt"
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1)) return "ios"
  return "manual"
}

/** How this device can install the app: native prompt (Android/Chrome), iOS share sheet, or browser menu. */
export function useInstallApp() {
  const platform = useSyncExternalStore(subscribe, currentPlatform, () => "installed" as const)

  const promptInstall = async () => {
    if (!deferredPrompt) return false
    const event = deferredPrompt
    await event.prompt()
    const { outcome } = await event.userChoice
    deferredPrompt = null
    notify()
    return outcome === "accepted"
  }

  return { platform, promptInstall }
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
    console.warn("No se pudo registrar el service worker", error)
  })
}
