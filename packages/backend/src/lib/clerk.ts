"use node"

import { createClerkClient } from "@clerk/backend"
import { getConvexEnv } from "../env"
import { parseUserRole, type UserRole } from "./staffRoles"

let cachedClerkClient: ReturnType<typeof createClerkClient> | null = null
let cachedSecretKey: string | null = null

export function getClerkBackendClient() {
  const secretKey = getConvexEnv().CLERK_SECRET_KEY

  if (!secretKey) {
    throw new Error("Missing CLERK_SECRET_KEY")
  }

  if (cachedClerkClient && cachedSecretKey === secretKey) {
    return cachedClerkClient
  }

  cachedSecretKey = secretKey
  cachedClerkClient = createClerkClient({ secretKey })

  return cachedClerkClient
}

function normalizePublicMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...value }
  }

  return {}
}

export async function syncClerkPublicMetadataRole(args: {
  clerkUserId: string
  currentPublicMetadata: unknown
  role: UserRole
}) {
  const publicMetadata = normalizePublicMetadata(args.currentPublicMetadata)
  const currentRole = parseUserRole(publicMetadata.role)

  if (currentRole === args.role) {
    return {
      changed: false,
      publicMetadata,
      role: args.role,
    }
  }

  const nextPublicMetadata = {
    ...publicMetadata,
    role: args.role,
  }

  await getClerkBackendClient().users.updateUserMetadata(args.clerkUserId, {
    publicMetadata: nextPublicMetadata,
  })

  return {
    changed: true,
    publicMetadata: nextPublicMetadata,
    role: args.role,
  }
}

export async function syncClerkCreatorAttributionMetadata(args: {
  clerkUserId: string
  code: string
  currentPublicMetadata: unknown
  source: "cookie" | "manual" | "staff"
}) {
  const publicMetadata = normalizePublicMetadata(args.currentPublicMetadata)
  const currentAttribution =
    publicMetadata.creatorAttribution &&
    typeof publicMetadata.creatorAttribution === "object" &&
    !Array.isArray(publicMetadata.creatorAttribution)
      ? (publicMetadata.creatorAttribution as Record<string, unknown>)
      : null

  if (
    currentAttribution?.code === args.code &&
    currentAttribution?.source === args.source
  ) {
    return {
      changed: false,
      publicMetadata,
    }
  }

  const nextPublicMetadata = {
    ...publicMetadata,
    creatorAttribution: {
      code: args.code,
      source: args.source,
    },
  }

  await getClerkBackendClient().users.updateUserMetadata(args.clerkUserId, {
    publicMetadata: nextPublicMetadata,
  })

  return {
    changed: true,
    publicMetadata: nextPublicMetadata,
  }
}
