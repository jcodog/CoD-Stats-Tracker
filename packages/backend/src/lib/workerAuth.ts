import { getConvexEnv } from "../env"

const textEncoder = new TextEncoder()

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = textEncoder.encode(left)
  const rightBytes = textEncoder.encode(right)
  const maxLength = Math.max(leftBytes.length, rightBytes.length)
  let mismatch = leftBytes.length === rightBytes.length ? 0 : 1

  for (let index = 0; index < maxLength; index += 1) {
    const leftByte = leftBytes[index] ?? 0
    const rightByte = rightBytes[index] ?? 0
    mismatch |= leftByte ^ rightByte
  }

  return mismatch === 0
}

export function requireValidTwitchWorkerSecret(workerSecret: string) {
  const expectedSecret = getConvexEnv().TWITCH_CONVEX_ADMIN_KEY?.trim()
  const normalizedSecret = workerSecret.trim()

  if (!expectedSecret) {
    throw new Error("Twitch worker API is not configured.")
  }

  if (!normalizedSecret || !timingSafeEqual(normalizedSecret, expectedSecret)) {
    throw new Error("Unauthorized worker request.")
  }
}
