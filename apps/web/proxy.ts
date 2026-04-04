import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// ChatGPT App endpoints must not require Clerk session.
export const CHATGPT_APP_PUBLIC_ROUTE_PATTERNS = [
  "/mcp(.*)",
  "/.well-known/oauth-authorization-server(.*)",
  "/.well-known/openid-configuration(.*)",
  "/.well-known/oauth-protected-resource(.*)",
  "/.well-known/oauth-protected-resource/mcp(.*)",
  "/oauth/authorize(.*)",
  "/oauth/token(.*)",
  "/oauth/revoke(.*)",
  "/oauth/register(.*)",
  "/ui/codstats/widget.html(.*)",
  "/ui/codstats/session.html(.*)",
  "/ui/codstats/matches.html(.*)",
  "/ui/codstats/rank.html(.*)",
  "/ui/codstats/settings.html(.*)",
  "/api/app(.*)",
  "/debug/chatgpt-app-config(.*)",
]

export const PUBLIC_ROUTE_PATTERNS = [
  "/",
  "/policies(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/.well-known/vercel/flags(.*)",
  ...CHATGPT_APP_PUBLIC_ROUTE_PATTERNS,
]

const matchesPublicRoute = createRouteMatcher(PUBLIC_ROUTE_PATTERNS)

type PublicRouteRequest = Parameters<typeof matchesPublicRoute>[0]

export function isPreviewCoverageEnabled() {
  return process.env.VERCEL_ENV === "preview"
}

function isCoveragePath(pathname: string) {
  return pathname === "/coverage" || pathname.startsWith("/coverage/")
}

export function isPublicRoute(req: PublicRouteRequest) {
  return (
    matchesPublicRoute(req) ||
    (isPreviewCoverageEnabled() && isCoveragePath(req.nextUrl.pathname))
  )
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
