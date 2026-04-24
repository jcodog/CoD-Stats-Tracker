import "server-only"

import { cache } from "react"
import { auth } from "@clerk/nextjs/server"
import { fetchQuery } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"
import { hasCreatorWorkspaceAccess } from "@workspace/backend/convex/lib/creatorProgram"

type CreatorToolsAccessState = {
  hasCreatorAccess: boolean
  isSignedIn: boolean
}

export const getCreatorToolsAccessState = cache(
  async (): Promise<CreatorToolsAccessState> => {
    const { userId, getToken } = await auth()

    if (!userId) {
      return {
        hasCreatorAccess: false,
        isSignedIn: false,
      }
    }

    const token = await getToken({ template: "convex" }).catch(() => null)

    if (!token) {
      return {
        hasCreatorAccess: false,
        isSignedIn: true,
      }
    }

    const [creatorWorkspaceState, dbUser, billingState] = await Promise.all([
      fetchQuery(
        api.queries.creator.dashboard.getCurrentCreatorWorkspaceState,
        {},
        { token }
      ),
      fetchQuery(api.queries.users.current, {}, { token }),
      fetchQuery(
        api.queries.billing.resolution.getCurrentUserResolvedBillingState,
        {},
        { token }
      ),
    ])

    return {
      hasCreatorAccess: hasCreatorWorkspaceAccess({
        fallbackPlanKey:
          billingState?.accessSource === "legacy_plan" ? dbUser?.plan : undefined,
        hasCreatorAccount: creatorWorkspaceState.hasCreatorAccount,
        state: billingState,
        userRole: dbUser?.role ?? null,
      }),
      isSignedIn: true,
    }
  }
)
