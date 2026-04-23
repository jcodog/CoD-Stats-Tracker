import "server-only"

import { cache } from "react"
import { auth } from "@clerk/nextjs/server"
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
    api.queries.creator.attribution.getPublicCreatorCodeSummary,
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

  const { getToken, userId } = await auth()

  if (!userId) {
    return null
  }

  const token = await getToken({ template: "convex" }).catch(() => null)

  if (!token) {
    return null
  }

  return fetchAction(
    api.actions.creator.attribution.applyCreatorCode,
    {
      code: pendingCode,
      source: "cookie",
    },
    {
      token,
    }
  )
}
