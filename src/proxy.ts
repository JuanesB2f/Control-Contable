import { NextResponse, type NextRequest } from "next/server"

import { LAST_ORGANIZATION_COOKIE, guestOnlyPaths, publicPathPrefixes, routes } from "@/config/routes"
import { isReservedSlug } from "@/modules/organizations/domain/slug"
import { updateSession } from "@/lib/supabase/proxy"

function matchesPath(pathname: string, path: string) {
  return path.endsWith("/") ? pathname.startsWith(path) : pathname === path || pathname.startsWith(`${path}/`)
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const session = await updateSession(request)

  const isPublic = publicPathPrefixes.some((path) => matchesPath(pathname, path))
  const isGuestOnly = guestOnlyPaths.some((path) => matchesPath(pathname, path))

  if (!session.isAuthenticated && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = routes.login
    url.search = pathname === routes.home ? "" : `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  if (session.isAuthenticated && isGuestOnly) {
    const url = request.nextUrl.clone()
    url.pathname = routes.home
    url.search = ""
    return NextResponse.redirect(url)
  }

  const response = session.response()

  const [firstSegment] = pathname.split("/").filter(Boolean)
  if (session.isAuthenticated && firstSegment && !isReservedSlug(firstSegment)) {
    response.cookies.set(LAST_ORGANIZATION_COOKIE, firstSegment, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
}
