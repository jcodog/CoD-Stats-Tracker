"use node"

import { v } from "convex/values"
import { action } from "../../_generated/server"
import { internal } from "../../_generated/api"
import { requireAuthorizedStaffAction } from "../../lib/staffActionAuth"
import type {
  StaffMutationResponse,
  StaffRankedDashboard,
} from "../../lib/staffTypes"

function formatPlural(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`
}

export const getDashboard = action({
  args: {},
  handler: async (ctx): Promise<StaffRankedDashboard> => {
    const operator = await requireAuthorizedStaffAction(ctx, "staff")
    const records = await ctx.runQuery(internal.queries.staff.internal.getRankedRecords, {})
    const titles = records.titles as Array<{
      isActive: boolean
      key: string
      label: string
      sortOrder: number
    }>
    const modes = records.modes as Array<{
      _id: string
      isActive: boolean
      key: string
      label: string
      sortOrder: number
      titleKey: string
      updatedAt: number
    }>
    const maps = records.maps as Array<{
      _id: string
      isActive: boolean
      name: string
      normalizedName: string
      sortOrder: number
      supportedModeIds?: string[]
      titleKey: string
      updatedAt: number
    }>
    const titleLabelByKey = new Map<string, string>(
      titles.map((title) => [title.key, title.label])
    )
    const modeLabelById = new Map<string, string>(
      modes.map((mode) => [mode._id, mode.label])
    )

    return {
      actorRole: operator.actorRole,
      currentConfig: records.config
        ? {
            activeSeason: records.config.activeSeason,
            activeTitleKey: records.config.activeTitleKey,
            activeTitleLabel:
              titleLabelByKey.get(records.config.activeTitleKey) ??
              records.config.activeTitleKey,
            openSessionCount: records.openSessionCount,
            updatedAt: records.config.updatedAt,
          }
        : null,
      generatedAt: Date.now(),
      maps: maps.map((map) => ({
        id: map._id,
        isActive: map.isActive,
        name: map.name,
        normalizedName: map.normalizedName,
        sortOrder: map.sortOrder,
        supportedModeIds: map.supportedModeIds ?? [],
        supportedModeLabels: (map.supportedModeIds ?? []).map(
          (modeId) => modeLabelById.get(modeId) ?? "Unknown mode"
        ),
        titleKey: map.titleKey,
        titleLabel: titleLabelByKey.get(map.titleKey) ?? map.titleKey,
        updatedAt: map.updatedAt,
      })),
      modes: modes.map((mode) => ({
        id: mode._id,
        isActive: mode.isActive,
        key: mode.key,
        label: mode.label,
        sortOrder: mode.sortOrder,
        titleKey: mode.titleKey,
        titleLabel: titleLabelByKey.get(mode.titleKey) ?? mode.titleKey,
        updatedAt: mode.updatedAt,
      })),
      openSessionCount: records.openSessionCount,
      titles: titles.map((title) => {
        const titleModes = modes.filter((mode) => mode.titleKey === title.key)
        const titleMaps = maps.filter((map) => map.titleKey === title.key)

        return {
          activeMapCount: titleMaps.filter((map) => map.isActive).length,
          activeModeCount: titleModes.filter((mode) => mode.isActive).length,
          isActive: title.isActive,
          key: title.key,
          label: title.label,
          mapCount: titleMaps.length,
          modeCount: titleModes.length,
          sortOrder: title.sortOrder,
        }
      }),
    }
  },
})

export const setCurrentRankedConfig = action({
  args: {
    activeSeason: v.number(),
    activeTitleKey: v.string(),
  },
  handler: async (ctx, args): Promise<StaffMutationResponse> => {
    const operator = await requireAuthorizedStaffAction(ctx, "staff")
    const result = await ctx.runMutation(
      internal.mutations.staff.internal.setCurrentRankedConfig,
      {
        activeSeason: args.activeSeason,
        activeTitleKey: args.activeTitleKey,
        updatedByUserId: operator.actorUserId,
      }
    )

    if (!result.didChange) {
      return {
        summary: `Current ranked config is already ${result.activeTitleLabel} season ${result.activeSeason}.`,
      }
    }

    const summary = result.didInitialize
      ? `Set the current ranked config to ${result.activeTitleLabel} season ${result.activeSeason}.`
      : `Switched the current ranked config to ${result.activeTitleLabel} season ${result.activeSeason} and archived ${formatPlural(result.archivedSessionCount, "open session")}.`

    await ctx.runMutation(internal.mutations.staff.internal.insertAuditLog, {
      action: result.didInitialize
        ? "ranked.config.initialize"
        : "ranked.config.rollover",
      actorClerkUserId: operator.actorClerkUserId,
      actorName: operator.actorDisplayName,
      actorRole: operator.actorRole,
      details: JSON.stringify(
        {
          activeSeason: result.activeSeason,
          activeTitleKey: result.activeTitleKey,
          archiveReason: result.archiveReason,
          archivedSessionCount: result.archivedSessionCount,
        },
        null,
        2
      ),
      entityId: "current",
      entityLabel: `${result.activeTitleLabel} season ${result.activeSeason}`,
      entityType: "ranked_config",
      result: "success",
      summary,
    })

    return { summary }
  },
})

export const upsertRankedTitle = action({
  args: {
    isActive: v.boolean(),
    key: v.string(),
    label: v.string(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args): Promise<StaffMutationResponse> => {
    const operator = await requireAuthorizedStaffAction(ctx, "admin")
    const result = await ctx.runMutation(
      internal.mutations.staff.internal.upsertRankedTitle,
      args
    )
    const summary = result.isNew
      ? `Created the ${result.label} ranked title.`
      : `${result.isActive ? "Updated" : "Archived"} the ${result.label} ranked title.`

    await ctx.runMutation(internal.mutations.staff.internal.insertAuditLog, {
      action: result.isNew ? "ranked.title.create" : "ranked.title.update",
      actorClerkUserId: operator.actorClerkUserId,
      actorName: operator.actorDisplayName,
      actorRole: operator.actorRole,
      details: JSON.stringify(
        {
          isActive: result.isActive,
          key: result.key,
          label: result.label,
          sortOrder: args.sortOrder,
        },
        null,
        2
      ),
      entityId: result.key,
      entityLabel: result.label,
      entityType: "ranked_title",
      result: "success",
      summary,
    })

    return { summary }
  },
})

export const upsertRankedMap = action({
  args: {
    isActive: v.boolean(),
    mapId: v.optional(v.id("rankedMaps")),
    name: v.string(),
    sortOrder: v.number(),
    supportedModeIds: v.array(v.id("rankedModes")),
    titleKey: v.string(),
  },
  handler: async (ctx, args): Promise<StaffMutationResponse> => {
    const operator = await requireAuthorizedStaffAction(ctx, "admin")
    const result = await ctx.runMutation(
      internal.mutations.staff.internal.upsertRankedMap,
      args
    )
    const summary = result.isNew
      ? `Created the ${result.name} map for ${result.titleLabel}.`
      : `${result.isActive ? "Updated" : "Archived"} the ${result.name} map for ${result.titleLabel}.`

    await ctx.runMutation(internal.mutations.staff.internal.insertAuditLog, {
      action: result.isNew ? "ranked.map.create" : "ranked.map.update",
      actorClerkUserId: operator.actorClerkUserId,
      actorName: operator.actorDisplayName,
      actorRole: operator.actorRole,
      details: JSON.stringify(
        {
          id: result.id,
          isActive: result.isActive,
          name: result.name,
          sortOrder: args.sortOrder,
          supportedModeIds: result.supportedModeIds,
          supportedModeLabels: result.supportedModeLabels,
          titleKey: result.titleKey,
        },
        null,
        2
      ),
      entityId: result.id,
      entityLabel: `${result.titleLabel} / ${result.name}`,
      entityType: "ranked_map",
      result: "success",
      summary,
    })

    return { summary }
  },
})

export const upsertRankedMode = action({
  args: {
    isActive: v.boolean(),
    key: v.string(),
    label: v.string(),
    modeId: v.optional(v.id("rankedModes")),
    sortOrder: v.number(),
    titleKey: v.string(),
  },
  handler: async (ctx, args): Promise<StaffMutationResponse> => {
    const operator = await requireAuthorizedStaffAction(ctx, "admin")
    const result = await ctx.runMutation(
      internal.mutations.staff.internal.upsertRankedMode,
      args
    )
    const summary = result.isNew
      ? `Created the ${result.label} mode for ${result.titleLabel}.`
      : `${result.isActive ? "Updated" : "Archived"} the ${result.label} mode for ${result.titleLabel}.`

    await ctx.runMutation(internal.mutations.staff.internal.insertAuditLog, {
      action: result.isNew ? "ranked.mode.create" : "ranked.mode.update",
      actorClerkUserId: operator.actorClerkUserId,
      actorName: operator.actorDisplayName,
      actorRole: operator.actorRole,
      details: JSON.stringify(
        {
          id: result.id,
          isActive: result.isActive,
          key: result.key,
          label: result.label,
          sortOrder: args.sortOrder,
          titleKey: result.titleKey,
        },
        null,
        2
      ),
      entityId: result.id,
      entityLabel: `${result.titleLabel} / ${result.label}`,
      entityType: "ranked_mode",
      result: "success",
      summary,
    })

    return { summary }
  },
})
