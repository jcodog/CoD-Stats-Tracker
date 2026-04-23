"use node"

import { v } from "convex/values"

import { internal } from "../../_generated/api"
import { action } from "../../_generated/server"

const VIEWER_QUEUE_INVITE_MODE_MIGRATION_CONFIRMATION =
  "migrate_viewer_queue_invite_modes"
const VIEWER_QUEUE_SCHEMA_MIGRATION_CONFIRMATION =
  "migrate_legacy_viewer_queue_schema"
const VIEWER_QUEUE_TWITCH_DISABLE_MIGRATION_CONFIRMATION =
  "disable_viewer_queue_twitch_integration"

export const runLegacyViewerQueueSchemaMigration = action({
  args: {
    confirm: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== VIEWER_QUEUE_SCHEMA_MIGRATION_CONFIRMATION) {
      throw new Error(
        `Pass confirm="${VIEWER_QUEUE_SCHEMA_MIGRATION_CONFIRMATION}" to run this migration.`
      )
    }

    return await ctx.runMutation(
      internal.mutations.migrations.playingWithViewers
        .migrateLegacyViewerQueueSchema,
      {
        dryRun: args.dryRun ?? false,
      }
    )
  },
})

export const runViewerQueueInviteModeMigration = action({
  args: {
    confirm: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== VIEWER_QUEUE_INVITE_MODE_MIGRATION_CONFIRMATION) {
      throw new Error(
        `Pass confirm="${VIEWER_QUEUE_INVITE_MODE_MIGRATION_CONFIRMATION}" to run this migration.`
      )
    }

    return await ctx.runMutation(
      internal.mutations.migrations.playingWithViewers
        .migrateLegacyViewerQueueInviteModes,
      {
        dryRun: args.dryRun ?? false,
      }
    )
  },
})

export const runViewerQueueTwitchDisableMigration = action({
  args: {
    confirm: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== VIEWER_QUEUE_TWITCH_DISABLE_MIGRATION_CONFIRMATION) {
      throw new Error(
        `Pass confirm="${VIEWER_QUEUE_TWITCH_DISABLE_MIGRATION_CONFIRMATION}" to run this migration.`
      )
    }

    return await ctx.runMutation(
      internal.mutations.migrations.playingWithViewers
        .disableViewerQueueTwitchIntegration,
      {
        dryRun: args.dryRun ?? false,
      }
    )
  },
})
