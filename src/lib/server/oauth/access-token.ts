import { getOAuthServerConfig } from "./config";
import {
  type OAuthAccessTokenClaims,
  verifyOAuthAccessTokenJwt,
} from "./jwt";

export type VerifiedOAuthAccessToken = OAuthAccessTokenClaims & {
  scopes: string[];
};

export function extractBearerToken(request: Request) {
  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || !token) {
    return null;
  }

  if (scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

export function verifyOAuthAccessToken(token: string, requestOrigin: string) {
  const config = getOAuthServerConfig(requestOrigin);

  const payload = verifyOAuthAccessTokenJwt(token, config.jwtSecret, {
    expectedIssuer: config.issuer,
    expectedAudience: config.audience,
  });

  return {
    ...payload,
    scopes: payload.scope
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  } satisfies VerifiedOAuthAccessToken;
}
