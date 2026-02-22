type OAuthServerConfig = {
  clientId: string;
  clientSecret: string;
  jwtSecret: string;
  audience: string;
  issuer: string;
  allowedRedirectUris: Set<string>;
  allowedScopes: Set<string> | null;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function normalizeAbsoluteUrl(rawUrl: string, fieldName: string) {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL in ${fieldName}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported protocol in ${fieldName}`);
  }

  return url.toString();
}

function parseAllowedRedirectUris() {
  const csv = requireEnv("OAUTH_ALLOWED_REDIRECT_URIS");
  const values = parseCsv(csv);

  if (values.length === 0) {
    throw new Error("OAUTH_ALLOWED_REDIRECT_URIS must include at least one URI");
  }

  return new Set(
    values.map((value) => normalizeAbsoluteUrl(value, "OAUTH_ALLOWED_REDIRECT_URIS")),
  );
}

function parseAllowedScopes() {
  const raw = process.env.OAUTH_ALLOWED_SCOPES?.trim();
  if (!raw) {
    return null;
  }

  const scopes = parseCsv(raw);
  if (scopes.length === 0) {
    return null;
  }

  return new Set(scopes);
}

export function getOAuthServerConfig(requestOrigin: string): OAuthServerConfig {
  const fallbackIssuer = normalizeAbsoluteUrl(requestOrigin, "request origin");
  const issuer = process.env.OAUTH_ISSUER
    ? normalizeAbsoluteUrl(process.env.OAUTH_ISSUER, "OAUTH_ISSUER")
    : fallbackIssuer;

  return {
    clientId: requireEnv("OAUTH_CLIENT_ID"),
    clientSecret: requireEnv("OAUTH_CLIENT_SECRET"),
    jwtSecret: requireEnv("OAUTH_JWT_SECRET"),
    audience: requireEnv("OAUTH_AUDIENCE"),
    issuer,
    allowedRedirectUris: parseAllowedRedirectUris(),
    allowedScopes: parseAllowedScopes(),
  };
}

export function normalizeRedirectUri(rawRedirectUri: string) {
  return normalizeAbsoluteUrl(rawRedirectUri, "redirect_uri");
}

export function isAllowedRedirectUri(
  redirectUri: string,
  allowedRedirectUris: Set<string>,
) {
  return allowedRedirectUris.has(redirectUri);
}
