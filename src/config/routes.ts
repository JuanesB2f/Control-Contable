export const routes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  onboarding: "/onboarding",
  authConfirm: "/auth/confirm",
  invite: (token: string) => `/invite/${token}`,
  org: {
    dashboard: (slug: string) => `/${slug}/dashboard`,
    settings: (slug: string) => `/${slug}/settings`,
    members: (slug: string) => `/${slug}/settings/members`,
    profile: (slug: string) => `/${slug}/settings/profile`,
    activity: (slug: string) => `/${slug}/settings/activity`,
  },
} as const

/** Pages only meant for signed-out visitors. */
export const guestOnlyPaths = [routes.login, routes.signup, routes.forgotPassword] as const

/** Paths reachable without a session. */
export const publicPathPrefixes = [...guestOnlyPaths, "/auth/"] as const

export const LAST_ORGANIZATION_COOKIE = "last_org"

/** Validates a post-login redirect target so it can only point inside the app. */
export function safeRedirectPath(value: string | null | undefined, fallback: string = routes.home) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback
  }
  return value
}
