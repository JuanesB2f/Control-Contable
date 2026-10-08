import * as Sentry from "@sentry/nextjs"
import posthog from "posthog-js"

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  })
}

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2026-08-30",
    person_profiles: "identified_only",
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
