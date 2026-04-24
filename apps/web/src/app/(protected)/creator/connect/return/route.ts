import { auth } from "@clerk/nextjs/server"
import { fetchAction } from "convex/nextjs"
import { NextResponse } from "next/server"

import { api } from "@workspace/backend/convex/_generated/api"

function sanitizeRouteErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim().slice(0, 180)
  }

  return "Unable to refresh Stripe Connect right now."
}

function buildCreatorCodeUrl(
  request: Request,
  params?: Record<string, string>
) {
  const url = new URL("/creator/code", request.url)

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value)
  }

  return url
}

function buildSignInUrl(request: Request) {
  const url = new URL("/sign-in", request.url)
  url.searchParams.set("redirect_url", "/creator/code")
  return url
}

export async function GET(request: Request) {
  const { userId, getToken } = await auth()
  const source = new URL(request.url).searchParams.get("source")

  if (!userId) {
    return NextResponse.redirect(buildSignInUrl(request))
  }

  const token = await getToken({ template: "convex" }).catch(() => null)

  if (!token) {
    return NextResponse.redirect(
      buildCreatorCodeUrl(request, {
        connect: "error",
        message: "Creator authentication expired. Sign in again and retry.",
      })
    )
  }

  try {
    await fetchAction(
      api.actions.creator.connect.syncCurrentCreatorConnectAccount,
      {},
      {
        token,
      }
    )

    return NextResponse.redirect(
      buildCreatorCodeUrl(request, {
        connect: source === "manual" ? "refreshed" : "returned",
      })
    )
  } catch (error) {
    return NextResponse.redirect(
      buildCreatorCodeUrl(request, {
        connect: "error",
        message: sanitizeRouteErrorMessage(error),
      })
    )
  }
}
