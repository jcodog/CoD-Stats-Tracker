import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    TWITCH_CLIENT_ID: z.string().min(1),
    TWITCH_CLIENT_SECRET: z.string().min(1),

    TWITCH_BOT_ACCESS_TOKEN: z.string().min(1).optional(),
    TWITCH_BOT_REFRESH_TOKEN: z.string().min(1).optional(),
    TWITCH_BOT_USER_ID: z.string().min(1),
    TWITCH_BOT_USER_LOGIN: z.string().min(1),

    TWITCH_EVENTSUB_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),

    TWITCH_EVENTSUB_SECRET: z.string().min(1),
    TWITCH_EVENTSUB_CALLBACK_BASE_URL: z.string().url(),
    TWITCH_EVENTSUB_CALLBACK_PATH: z
      .string()
      .min(1)
      .default("/webhooks/twitch/eventsub"),

    TWITCH_HTTP_PORT: z.coerce.number().int().positive().default(8787),

    TWITCH_CONVEX_URL: z.string().min(1),
    TWITCH_CONVEX_ADMIN_KEY: z.string().min(1),
    TWITCH_TOKEN_STORE_PATH: z.string().min(1),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,

    TWITCH_BOT_ACCESS_TOKEN: process.env.TWITCH_BOT_ACCESS_TOKEN,
    TWITCH_BOT_REFRESH_TOKEN: process.env.TWITCH_BOT_REFRESH_TOKEN,
    TWITCH_BOT_USER_ID: process.env.TWITCH_BOT_USER_ID,
    TWITCH_BOT_USER_LOGIN: process.env.TWITCH_BOT_USER_LOGIN,

    TWITCH_EVENTSUB_ENABLED: process.env.TWITCH_EVENTSUB_ENABLED,

    TWITCH_EVENTSUB_SECRET: process.env.TWITCH_EVENTSUB_SECRET,
    TWITCH_EVENTSUB_CALLBACK_BASE_URL:
      process.env.TWITCH_EVENTSUB_CALLBACK_BASE_URL,
    TWITCH_EVENTSUB_CALLBACK_PATH: process.env.TWITCH_EVENTSUB_CALLBACK_PATH,
    TWITCH_HTTP_PORT: process.env.TWITCH_HTTP_PORT,

    TWITCH_CONVEX_URL: process.env.TWITCH_CONVEX_URL,
    TWITCH_CONVEX_ADMIN_KEY: process.env.TWITCH_CONVEX_ADMIN_KEY,
    TWITCH_TOKEN_STORE_PATH: process.env.TWITCH_TOKEN_STORE_PATH,
  },
})
