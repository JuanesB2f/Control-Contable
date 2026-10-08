"use client"

import { RotateCcw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"

import { EmptyState } from "./empty-state"

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = "No pudimos cargar esta sección",
  description = "Puede ser un problema de conexión. Intenta de nuevo en unos segundos.",
  onRetry,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw data-icon="inline-start" />
            Reintentar
          </Button>
        ) : null
      }
    />
  )
}
