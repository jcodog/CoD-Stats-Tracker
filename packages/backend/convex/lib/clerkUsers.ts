import type { UserJSON } from "@clerk/nextjs/server"

import { resolveConfiguredUserRole } from "./staffRoleConfig"
import { parseUserRole, type UserRole } from "./staffRoles"

export function getDiscordIdFromClerkUser(data: UserJSON): string | null {
  const accounts = Array.isArray(data.external_accounts)
    ? data.external_accounts
    : []
  const discord = accounts.find(
    (account) => (account.provider ?? "").toLowerCase() === "oauth_discord"
  )

  return typeof discord?.provider_user_id === "string" &&
    discord.provider_user_id.length > 0
    ? discord.provider_user_id
    : null
}

export function resolveProvisionedUserRoleFromClerk(data: UserJSON): UserRole {
  const publicMetadataRole = parseUserRole(data.public_metadata?.role)

  return (
    resolveConfiguredUserRole({
      discordId: getDiscordIdFromClerkUser(data),
      role: publicMetadataRole,
    }) ?? "user"
  )
}
