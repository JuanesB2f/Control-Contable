"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
          background: "#f4f9f4",
          color: "#0d130e",
        }}
      >
        <title>Algo salió mal</title>
        <main style={{ textAlign: "center", padding: 24, maxWidth: 380 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Algo salió mal</h1>
          <p style={{ fontSize: 15, color: "#6e6e73", margin: "0 0 20px", lineHeight: 1.45 }}>
            Tuvimos un problema inesperado. Ya lo registramos; intenta de nuevo en unos segundos.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              background: "#2e7d32",
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  )
}
