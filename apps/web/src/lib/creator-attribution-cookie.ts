const CREATOR_ATTRIBUTION_SECRET_ENV_KEY = "CREATOR_ATTRIBUTION_SECRET"

export const CREATOR_ATTRIBUTION_COOKIE_NAME = "creator_attribution"
export const CREATOR_ATTRIBUTION_QUERY_PARAM = "creator"
export const CREATOR_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const CREATOR_CODE_PATTERN = /^[A-Z0-9]{3,24}$/
const encoder = new TextEncoder()

function getCreatorAttributionSecret() {
  return process.env[CREATOR_ATTRIBUTION_SECRET_ENV_KEY]?.trim() ?? ""
}

function bytesToBase64Url(bytes: Uint8Array) {
  const base64 = btoa(String.fromCharCode(...bytes))

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(value: string) {
  try {
    const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/")
    const paddingLength = (4 - (normalizedValue.length % 4)) % 4
    const base64Value = `${normalizedValue}${"=".repeat(paddingLength)}`
    const decodedValue = atob(base64Value)

    return Uint8Array.from(decodedValue, (character) =>
      character.charCodeAt(0)
    )
  } catch {
    return null
  }
}

async function getSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

async function signCreatorCode(normalizedCode: string) {
  const secret = getCreatorAttributionSecret()

  if (!secret) {
    return null
  }

  const key = await getSigningKey(secret)
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(normalizedCode)
  )

  return bytesToBase64Url(new Uint8Array(signature))
}

export function normalizeCreatorCode(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null
  }

  const normalizedCode = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")

  if (!CREATOR_CODE_PATTERN.test(normalizedCode)) {
    return null
  }

  return normalizedCode
}

export async function createSignedCreatorAttributionValue(
  normalizedCode: string
) {
  const signature = await signCreatorCode(normalizedCode)

  if (!signature) {
    return null
  }

  return `${normalizedCode}.${signature}`
}

export async function verifySignedCreatorAttributionValue(
  value: string | null | undefined
) {
  if (typeof value !== "string") {
    return null
  }

  const [rawCode, rawSignature] = value.split(".")

  if (!rawCode || !rawSignature) {
    return null
  }

  const normalizedCode = normalizeCreatorCode(rawCode)
  const secret = getCreatorAttributionSecret()

  if (!normalizedCode || !secret) {
    return null
  }

  const signatureBytes = base64UrlToBytes(rawSignature)

  if (!signatureBytes) {
    return null
  }

  const key = await getSigningKey(secret)
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(normalizedCode)
  )

  if (!isValid) {
    return null
  }

  return {
    normalizedCode,
  }
}

export function getCreatorAttributionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: CREATOR_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  }
}
