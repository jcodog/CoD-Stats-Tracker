import { describe, expect, it } from "bun:test";

import {
  authorizeRedirectResponse,
  getClientAuthenticationInput,
  getClientCredentials,
  getSingleSearchParam,
  oauthErrorResponse,
  oauthSuccessResponse,
  parseOAuthRequestBody,
} from "../oauth/http.ts";

describe("oauth http helpers", () => {
  it("formats OAuth error responses with standard no-store headers", async () => {
    const response = oauthErrorResponse(
      "invalid_request",
      400,
      "Missing redirect_uri",
      { "X-Test": "yes" },
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("X-Test")).toBe("yes");
    expect(await response.json()).toEqual({
      error: "invalid_request",
      error_description: "Missing redirect_uri",
    });
  });

  it("formats OAuth success responses with no-store headers", async () => {
    const response = oauthSuccessResponse({ access_token: "token" });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ access_token: "token" });
  });

  it("builds authorize redirects with merged query parameters", () => {
    const response = authorizeRedirectResponse("https://chatgpt.com/callback", {
      code: "code_123",
      state: "state_123",
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://chatgpt.com/callback?code=code_123&state=state_123",
    );
  });

  it("reads single search params and rejects duplicates", () => {
    const params = new URLSearchParams("client_id=client&client_secret=secret");
    expect(getSingleSearchParam(params, "client_id")).toBe("client");
    expect(getSingleSearchParam(params, "missing")).toBeNull();

    const duplicated = new URLSearchParams("scope=one&scope=two");
    expect(() => getSingleSearchParam(duplicated, "scope")).toThrow(
      /duplicate_param:scope/,
    );
  });

  it("parses form-encoded and json OAuth request bodies", async () => {
    const formRequest = new Request("https://example.com/oauth/token", {
      body: "grant_type=authorization_code&code=code_123",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const jsonRequest = new Request("https://example.com/oauth/token", {
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: "code_123",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect((await parseOAuthRequestBody(formRequest)).get("code")).toBe("code_123");
    expect((await parseOAuthRequestBody(jsonRequest)).get("grant_type")).toBe(
      "authorization_code",
    );
  });

  it("rejects non-string JSON body parameters", async () => {
    const request = new Request("https://example.com/oauth/token", {
      body: JSON.stringify({
        expires_in: 3600,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    await expect(parseOAuthRequestBody(request)).rejects.toThrow(
      /invalid_param_type:expires_in/,
    );
  });

  it("prefers HTTP basic auth credentials and validates body mismatches", () => {
    const params = new URLSearchParams();
    const request = new Request("https://example.com/oauth/token", {
      headers: {
        Authorization: `Basic ${Buffer.from("client-id:secret-value").toString("base64")}`,
      },
    });

    expect(getClientAuthenticationInput(request, params)).toEqual({
      clientId: "client-id",
      clientSecret: "secret-value",
      usedBasicAuth: true,
    });

    const mismatchedClientId = new URLSearchParams("client_id=other-client");
    expect(() => getClientAuthenticationInput(request, mismatchedClientId)).toThrow(
      /client_id_mismatch/,
    );

    const mismatchedSecret = new URLSearchParams("client_secret=other-secret");
    expect(() => getClientAuthenticationInput(request, mismatchedSecret)).toThrow(
      /client_secret_mismatch/,
    );
  });

  it("rejects malformed HTTP basic credentials", () => {
    expect(() =>
      getClientAuthenticationInput(
        new Request("https://example.com/oauth/token", {
          headers: {
            Authorization: `Basic ${Buffer.from("missing-separator").toString("base64")}`,
          },
        }),
        new URLSearchParams(),
      ),
    ).toThrow(/invalid_basic_auth/);

    expect(() =>
      getClientAuthenticationInput(
        new Request("https://example.com/oauth/token", {
          headers: {
            Authorization: `Basic ${Buffer.from("client-id:").toString("base64")}`,
          },
        }),
        new URLSearchParams(),
      ),
    ).toThrow(/invalid_basic_auth/);
  });

  it("supports public clients from body auth and requires client ids", () => {
    const request = new Request("https://example.com/oauth/token");

    const params = new URLSearchParams("client_id=public-client");
    expect(getClientAuthenticationInput(request, params)).toEqual({
      clientId: "public-client",
      clientSecret: null,
      usedBasicAuth: false,
    });

    expect(() => getClientAuthenticationInput(request, new URLSearchParams())).toThrow(
      /missing_client_id/,
    );
  });

  it("ignores non-basic auth headers and rejects malformed basic credentials", () => {
    expect(
      getClientAuthenticationInput(
        new Request("https://example.com/oauth/token", {
          headers: {
            Authorization: "Digest opaque-token",
          },
        }),
        new URLSearchParams("client_id=body-client&client_secret=body-secret"),
      ),
    ).toEqual({
      clientId: "body-client",
      clientSecret: "body-secret",
      usedBasicAuth: false,
    });

    expect(() =>
      getClientAuthenticationInput(
        new Request("https://example.com/oauth/token", {
          headers: {
            Authorization: "Basic =",
          },
        }),
        new URLSearchParams(),
      ),
    ).toThrow(/invalid_basic_auth/);
  });

  it("requires a client secret when resolving client credentials", () => {
    const request = new Request("https://example.com/oauth/token");
    const params = new URLSearchParams("client_id=public-client");

    expect(() => getClientCredentials(request, params)).toThrow(
      /missing_client_credentials/,
    );
  });

  it("parses fallback request bodies and returns explicit client credentials", async () => {
    const request = new Request("https://example.com/oauth/token", {
      body: "client_id=client&client_secret=secret",
      headers: {
        "Content-Type": "text/plain",
      },
      method: "POST",
    });

    const params = await parseOAuthRequestBody(request);
    expect(params.get("client_secret")).toBe("secret");
    expect(getClientCredentials(new Request("https://example.com/oauth/token"), params)).toEqual(
      {
        clientId: "client",
        clientSecret: "secret",
      },
    );
  });
});
