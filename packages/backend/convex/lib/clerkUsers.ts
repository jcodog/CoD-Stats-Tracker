import { resolveConfiguredUserRole } from "./staffRoleConfig"
import { parseUserRole, type UserRole } from "./staffRoles"

type SupportedConnectedAccountProvider = "discord" | "twitch"

type SupportedConnectedAccount = {
  displayName?: string
  provider: SupportedConnectedAccountProvider
  providerLogin?: string
  providerUserId: string
}

type ClerkExternalAccount = {
  firstName?: string | null
  first_name?: string | null
  identificationId?: string | null
  identification_id?: string | null
  imageUrl?: string | null
  image_url?: string | null
  lastName?: string | null
  last_name?: string | null
  provider?: string | null
  providerUserId?: string | null
  provider_user_id?: string | null
  username?: string | null
}

type ClerkUserLike = {
  externalAccounts?: ClerkExternalAccount[] | null
  external_accounts?: ClerkExternalAccount[] | null
  publicMetadata?: {
    role?: unknown
  } | null
  public_metadata?: {
    role?: unknown
  } | null
}

function getClerkExternalAccounts(data: ClerkUserLike): ClerkExternalAccount[] {
  if (Array.isArray(data.external_accounts)) {
    return data.external_accounts as ClerkExternalAccount[]
  }

  if (Array.isArray(data.externalAccounts)) {
    return data.externalAccounts as ClerkExternalAccount[]
  }

  return []
}

function normalizeConnectedAccountProvider(
  provider: string | null | undefined
): SupportedConnectedAccountProvider | null {
  const normalized = provider?.trim().toLowerCase()

  if (normalized === "oauth_discord" || normalized === "discord") {
    return "discord"
  }

  if (normalized === "oauth_twitch" || normalized === "twitch") {
    return "twitch"
  }

  return null
}

function toSupportedConnectedAccount(
  account: ClerkExternalAccount
): SupportedConnectedAccount | null {
  const provider = normalizeConnectedAccountProvider(account.provider)
  const providerUserId =
    account.provider_user_id?.trim() ?? account.providerUserId?.trim()

  if (!provider || !providerUserId) {
    return null
  }

  const displayName = [
    account.first_name?.trim() ?? account.firstName?.trim(),
    account.last_name?.trim() ?? account.lastName?.trim(),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
  const providerLogin = account.username?.trim() || undefined

  return {
    displayName: displayName || providerLogin,
    provider,
    providerLogin,
    providerUserId,
  }
}

export function getConnectedAccountsFromClerkUser(
  data: ClerkUserLike
): SupportedConnectedAccount[] {
  const accountMap = new Map<
    SupportedConnectedAccountProvider,
    SupportedConnectedAccount
  >()

  for (const account of getClerkExternalAccounts(data)) {
    const normalizedAccount = toSupportedConnectedAccount(account)

    if (!normalizedAccount) {
      continue
    }

    accountMap.set(normalizedAccount.provider, normalizedAccount)
  }

  return [...accountMap.values()]
}

export function getDiscordIdFromClerkUser(data: ClerkUserLike): string | null {
  return (
    getConnectedAccountsFromClerkUser(data).find(
      (account) => account.provider === "discord"
    )?.providerUserId ?? null
  )
}

export function getTwitchAccountFromClerkUser(data: ClerkUserLike) {
  return (
    getConnectedAccountsFromClerkUser(data).find(
      (account) => account.provider === "twitch"
    ) ?? null
  )
}

export function resolveProvisionedUserRoleFromClerk(
  data: ClerkUserLike
): UserRole {
  const publicMetadataRole = parseUserRole(
    data.public_metadata?.role ?? data.publicMetadata?.role
  )

  return (
    resolveConfiguredUserRole({
      discordId: getDiscordIdFromClerkUser(data),
      role: publicMetadataRole,
    }) ?? "user"
  )
}
