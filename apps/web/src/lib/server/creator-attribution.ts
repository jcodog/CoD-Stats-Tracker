import "server-only"

import { cache } from "react"
import { getViewerSession } from "@/lib/server/viewer"
import { fetchAction, fetchQuery } from "convex/nextjs"
import { cookies } from "next/headers"

import { api } from "@workspace/backend/convex/_generated/api"

import {
  CREATOR_ATTRIBUTION_COOKIE_NAME,
  verifySignedCreatorAttributionValue,
} from "@/lib/creator-attribution-cookie"

export type PendingCreatorCodeSummary = {
  code: string
  discountPercent: number
}

export const getPendingCreatorCode = cache(async () => {
  const cookieStore = await cookies()
  const cookieValue =
    cookieStore.get(CREATOR_ATTRIBUTION_COOKIE_NAME)?.value ?? null
  const verifiedValue = await verifySignedCreatorAttributionValue(cookieValue)

  return verifiedValue?.normalizedCode ?? null
})

export const getPendingCreatorCodeSummary = cache(async () => {
  const pendingCode = await getPendingCreatorCode()

  if (!pendingCode) {
    return null
  }

  return (await fetchQuery(
    api.queries.creator.attribution.public.getPublicCreatorCodeSummary,
    {
      code: pendingCode,
    }
  )) as PendingCreatorCodeSummary | null
})

export async function canonicalizePendingCreatorAttribution() {
  const pendingCode = await getPendingCreatorCode()

  if (!pendingCode) {
    return null
  }

  const { convexToken: token, userId } = await getViewerSession()

  if (!userId) {
    return null
  }

  if (!token) {
    return null
  }

  return fetchAction(
    api.actions.creator.attribution.apply.applyCreatorCode,
    {
      code: pendingCode,
      source: "cookie",
    },
    {
      token,
    }
  )
}
