import "server-only"

import { headers } from "next/headers"

export type RequestViewport = "desktop" | "mobile"

const MOBILE_DEVICE_PATTERN =
  /android.+mobile|iphone|ipod|windows phone|blackberry|bb10|opera mini|webos/i
const TABLET_DEVICE_PATTERN = /ipad|tablet|kindle|silk|playbook|android(?!.*mobile)/i

export async function resolveRequestViewport(): Promise<RequestViewport> {
  const requestHeaders = await headers()
  const userAgent = requestHeaders.get("user-agent") ?? ""

  if (
    MOBILE_DEVICE_PATTERN.test(userAgent) ||
    TABLET_DEVICE_PATTERN.test(userAgent)
  ) {
    return "mobile"
  }

  return "desktop"
}
