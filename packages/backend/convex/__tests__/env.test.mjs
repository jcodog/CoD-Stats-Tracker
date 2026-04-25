import { afterAll, beforeEach, describe, expect, it } from "bun:test"

import {
  getConvexAuthEnv,
  getConvexEnv,
  resetConvexEnvForTests,
} from "../../src/env.js"

const ENV_KEYS = [
  "CLERK_JWT_ISSUER_URL",
  "DISCORD_APPLICATION_ID",
  "REDIS_URL",
  "STRIPE_SECRET_KEY",
]

const previousEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]])
)

function applyEnv(overrides = {}) {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }

  Object.assign(process.env, overrides)
  resetConvexEnvForTests()
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = previousEnv[key]

    if (value === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }

  resetConvexEnvForTests()
}

beforeEach(() => {
  applyEnv({
    DISCORD_APPLICATION_ID: "1234567890",
    REDIS_URL: "redis://localhost:6379",
    STRIPE_SECRET_KEY: "sk_test_123",
  })
})

afterAll(() => {
  restoreEnv()
})

describe("convex env", () => {
  it("caches values until resetConvexEnvForTests is called", () => {
    expect(getConvexEnv().STRIPE_SECRET_KEY).toBe("sk_test_123")

    process.env.STRIPE_SECRET_KEY = "sk_test_changed"

    expect(getConvexEnv().STRIPE_SECRET_KEY).toBe("sk_test_123")

    resetConvexEnvForTests()

    expect(getConvexEnv().STRIPE_SECRET_KEY).toBe("sk_test_changed")
  })

  it("treats empty strings as undefined", () => {
    applyEnv({
      DISCORD_APPLICATION_ID: "",
    })

    expect(getConvexEnv().DISCORD_APPLICATION_ID).toBeUndefined()
  })

  it("allows auth config consumers to read the Clerk issuer without unrelated env", () => {
    applyEnv({
      CLERK_JWT_ISSUER_URL: "https://clerk.example.com",
    })

    expect(getConvexAuthEnv().CLERK_JWT_ISSUER_URL).toBe(
      "https://clerk.example.com"
    )
  })
})
