import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it } from "bun:test";

import {
  signOAuthAccessToken,
  verifyOAuthAccessTokenJwt,
} from "../oauth/jwt.ts";

const SECRET = "jwt_test_secret";
const ORIGINAL_DATE_NOW = Date.now;
const NOW_SECONDS = 1_700_000_000;

function withMockedNow(seconds) {
  Date.now = () => seconds * 1_000;
}

function createToken(header, payload, secret = SECRET) {
  const encodedHeader = Buffer.from(JSON.stringify(header), "utf8").toString(
    "base64url",
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret)
    .update(signingInput, "utf8")
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

function createClaims(overrides = {}) {
  return {
    iss: "https://stats.example.com",
    aud: "https://stats.example.com",
    sub: "user_123",
    iat: NOW_SECONDS - 10,
    exp: NOW_SECONDS + 60,
    scope: "profile.read stats.read",
    jti: "jti_123",
    ...overrides,
  };
}

afterEach(() => {
  Date.now = ORIGINAL_DATE_NOW;
});

describe("oauth jwt helpers", () => {
  it("signs and verifies valid access tokens", () => {
    withMockedNow(NOW_SECONDS);

    const claims = createClaims();
    const token = signOAuthAccessToken(claims, SECRET);

    expect(
      verifyOAuthAccessTokenJwt(token, SECRET, {
        expectedIssuer: claims.iss,
        expectedAudiences: [claims.aud],
      }),
    ).toEqual(claims);
  });

  it("rejects malformed and tampered JWTs", () => {
    withMockedNow(NOW_SECONDS);

    expect(() =>
      verifyOAuthAccessTokenJwt("not-a-jwt", SECRET, {
        expectedIssuer: "https://stats.example.com",
        expectedAudiences: ["https://stats.example.com"],
      }),
    ).toThrow(/Malformed JWT/);

    expect(() =>
      verifyOAuthAccessTokenJwt("header..signature", SECRET, {
        expectedIssuer: "https://stats.example.com",
        expectedAudiences: ["https://stats.example.com"],
      }),
    ).toThrow(/Malformed JWT/);

    const token = signOAuthAccessToken(createClaims(), SECRET);
    const [header, payload] = token.split(".");
    const tamperedToken = `${header}.${payload}.bad-signature`;

    expect(() =>
      verifyOAuthAccessTokenJwt(tamperedToken, SECRET, {
        expectedIssuer: "https://stats.example.com",
        expectedAudiences: ["https://stats.example.com"],
      }),
    ).toThrow(/Invalid token signature/);
  });

  it("rejects unsupported headers and invalid payloads", () => {
    withMockedNow(NOW_SECONDS);

    const unsupportedHeaderToken = createToken(
      { alg: "none", typ: "JWT" },
      createClaims(),
    );

    expect(() =>
      verifyOAuthAccessTokenJwt(unsupportedHeaderToken, SECRET, {
        expectedIssuer: "https://stats.example.com",
        expectedAudiences: ["https://stats.example.com"],
      }),
    ).toThrow(/Unsupported JWT header/);

    const invalidPayloadToken = createToken(
      { alg: "HS256", typ: "JWT" },
      {
        ...createClaims(),
        exp: "tomorrow",
      },
    );

    expect(() =>
      verifyOAuthAccessTokenJwt(invalidPayloadToken, SECRET, {
        expectedIssuer: "https://stats.example.com",
        expectedAudiences: ["https://stats.example.com"],
      }),
    ).toThrow(/Invalid JWT payload/);
  });

  it("rejects expired tokens and future iat values", () => {
    withMockedNow(NOW_SECONDS);

    const expiredToken = signOAuthAccessToken(
      createClaims({
        exp: NOW_SECONDS - 1,
      }),
      SECRET,
    );
    expect(() =>
      verifyOAuthAccessTokenJwt(expiredToken, SECRET, {
        expectedIssuer: "https://stats.example.com",
        expectedAudiences: ["https://stats.example.com"],
      }),
    ).toThrow(/Token expired/);

    const futureIatToken = signOAuthAccessToken(
      createClaims({
        iat: NOW_SECONDS + 31,
      }),
      SECRET,
    );
    expect(() =>
      verifyOAuthAccessTokenJwt(futureIatToken, SECRET, {
        expectedIssuer: "https://stats.example.com",
        expectedAudiences: ["https://stats.example.com"],
      }),
    ).toThrow(/Token iat is in the future/);
  });

  it("rejects issuer and audience mismatches", () => {
    withMockedNow(NOW_SECONDS);

    const token = signOAuthAccessToken(createClaims(), SECRET);

    expect(() =>
      verifyOAuthAccessTokenJwt(token, SECRET, {
        expectedIssuer: "https://other.example.com",
        expectedAudiences: ["https://stats.example.com"],
      }),
    ).toThrow(/Invalid token issuer/);

    expect(() =>
      verifyOAuthAccessTokenJwt(token, SECRET, {
        expectedIssuer: "https://stats.example.com",
        expectedAudiences: ["https://other.example.com"],
      }),
    ).toThrow(/Invalid token audience/);
  });
});
