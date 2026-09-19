import "server-only"

import { cache } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@workspace/backend/convex/_generated/api"

// Request-scoped only. Never persist tokens or access decisions across requests.
export const getViewerSession = cache(async () => {
  const { userId, getToken } = await auth()
  const convexToken = userId
    ? await getToken({ template: "convex" }).catch(() => null)
    : null
  return { userId, convexToken }
})

export const getViewer = cache(async () => {
  const session = await getViewerSession()
  const [clerkUser, access] = await Promise.all([
    session.userId ? currentUser() : null,
    session.convexToken
      ? fetchQuery(
          api.queries.users.getViewerAccess,
          {},
          { token: session.convexToken }
        )
      : null,
  ])
  return { ...session, clerkUser, access }
})
