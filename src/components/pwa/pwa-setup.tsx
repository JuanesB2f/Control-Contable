"use client"

import { useEffect } from "react"

import { registerServiceWorker } from "./install-app"

/** Registers the service worker in production; dev skips it so hot reload isn't cached. */
export function PwaSetup() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") registerServiceWorker()
  }, [])
  return null
}
