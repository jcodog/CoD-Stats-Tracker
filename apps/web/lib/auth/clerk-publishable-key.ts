const LEGACY_CLERK_FRONTEND_API_HOST_SUFFIX = ".cleoai.cloud"
const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

function normalizeBase64Payload(payload: string) {
  const paddingLength = (4 - (payload.length % 4)) % 4
  const paddedPayload = `${payload}${"=".repeat(paddingLength)}`

  return paddedPayload.replace(/-/g, "+").replace(/_/g, "/")
}

export function getClerkPublishableKeyFrontendApiHost(
  publishableKey: string
) {
  const segments = publishableKey.trim().split("_")
  const encodedHost = segments.slice(2).join("_")

  if (!encodedHost) {
    return null
  }

  try {
    const decodedPayload = atob(normalizeBase64Payload(encodedHost))
    const normalizedHost = decodedPayload.replace(/\$$/, "").trim()
    return HOSTNAME_PATTERN.test(normalizedHost) ? normalizedHost : null
  } catch {
    return null
  }
}

export function isLegacyClerkPublishableKey(publishableKey: string) {
  const frontendApiHost =
    getClerkPublishableKeyFrontendApiHost(publishableKey)

  return frontendApiHost?.endsWith(LEGACY_CLERK_FRONTEND_API_HOST_SUFFIX) ?? false
}
