import "server-only"

function getPrimaryForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? null
}

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getExpectedOrigin(request: Request, requestUrl: URL) {
  const forwardedHost = getPrimaryForwardedValue(
    request.headers.get("x-forwarded-host")
  )
  const forwardedProto = getPrimaryForwardedValue(
    request.headers.get("x-forwarded-proto")
  )

  if (forwardedHost && forwardedProto) {
    const forwardedOrigin = normalizeOrigin(`${forwardedProto}://${forwardedHost}`)

    if (forwardedOrigin) {
      return forwardedOrigin
    }
  }

  const host = getPrimaryForwardedValue(request.headers.get("host"))

  if (host) {
    const hostOrigin = normalizeOrigin(`${requestUrl.protocol}//${host}`)

    if (hostOrigin) {
      return hostOrigin
    }
  }

  return requestUrl.origin
}

function getRequestOrigin(request: Request) {
  const origin = normalizeOrigin(request.headers.get("origin"))

  if (origin) {
    return origin
  }

  return normalizeOrigin(request.headers.get("referer"))
}

export function validateSameOriginJsonMutationRequest(args: {
  headerName: string
  headerValue: string
  request: Request
}) {
  const requestUrl = new URL(args.request.url)

  if (args.request.headers.get(args.headerName) !== args.headerValue) {
    return "Missing CSRF protection header"
  }

  const contentType = args.request.headers.get("content-type")?.toLowerCase() ?? ""

  if (!contentType.includes("application/json")) {
    return "Invalid content type"
  }

  const fetchSite = args.request.headers.get("sec-fetch-site")

  if (fetchSite && fetchSite !== "same-origin") {
    return "Cross-site request blocked"
  }

  const expectedOrigin = getExpectedOrigin(args.request, requestUrl)
  const requestOrigin = getRequestOrigin(args.request)

  if (!requestOrigin || requestOrigin !== expectedOrigin) {
    return "Origin validation failed"
  }

  return null
}
