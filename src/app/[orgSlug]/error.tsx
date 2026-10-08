"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

import { ErrorState } from "@/components/feedback/error-state"
import { PageContainer } from "@/components/layout/page-header"

export default function OrganizationError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <PageContainer>
      <ErrorState onRetry={retry} />
    </PageContainer>
  )
}
