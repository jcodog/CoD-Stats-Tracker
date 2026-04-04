import { describe, expect, it } from "bun:test";

import {
  getClerkPublishableKeyFrontendApiHost,
  isLegacyClerkPublishableKey,
} from "@/lib/auth/clerk-publishable-key";

const LEGACY_PUBLISHABLE_KEY = "pk_live_Y2xlcmsuY2xlb2FpLmNsb3VkJA";
const CODSTATS_PUBLISHABLE_KEY = "pk_live_Y2xlcmsuY29kc3RhdHMudGVjaCQ";

describe("clerk publishable key helpers", () => {
  it("decodes the Clerk frontend API host from the publishable key payload", () => {
    expect(getClerkPublishableKeyFrontendApiHost(LEGACY_PUBLISHABLE_KEY)).toBe(
      "clerk.cleoai.cloud",
    );
    expect(getClerkPublishableKeyFrontendApiHost(CODSTATS_PUBLISHABLE_KEY)).toBe(
      "clerk.codstats.tech",
    );
  });

  it("flags legacy cleoai.cloud publishable keys", () => {
    expect(isLegacyClerkPublishableKey(LEGACY_PUBLISHABLE_KEY)).toBe(true);
    expect(isLegacyClerkPublishableKey(CODSTATS_PUBLISHABLE_KEY)).toBe(false);
  });

  it("returns null for keys that do not contain a decodable frontend API host", () => {
    expect(getClerkPublishableKeyFrontendApiHost("pk_live_not-base64")).toBeNull();
    expect(isLegacyClerkPublishableKey("pk_live_not-base64")).toBe(false);
  });
});
