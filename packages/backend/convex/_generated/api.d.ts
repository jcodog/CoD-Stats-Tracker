/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_billing_customer from "../actions/billing/customer.js";
import type * as actions_billing_syncCatalogToStripe from "../actions/billing/syncCatalogToStripe.js";
import type * as actions_creatorTools_playingWithViewers_discord from "../actions/creatorTools/playingWithViewers/discord.js";
import type * as actions_creatorTools_playingWithViewers_queue from "../actions/creatorTools/playingWithViewers/queue.js";
import type * as actions_creatorTools_playingWithViewers_twitch from "../actions/creatorTools/playingWithViewers/twitch.js";
import type * as actions_creator_attribution from "../actions/creator/attribution.js";
import type * as actions_creator_connect from "../actions/creator/connect.js";
import type * as actions_discord_registerCommands from "../actions/discord/registerCommands.js";
import type * as actions_featureFlags_sync from "../actions/featureFlags/sync.js";
import type * as actions_migrations_playingWithViewers from "../actions/migrations/playingWithViewers.js";
import type * as actions_staff_billing from "../actions/staff/billing.js";
import type * as actions_staff_management from "../actions/staff/management.js";
import type * as actions_staff_overview from "../actions/staff/overview.js";
import type * as actions_staff_ranked from "../actions/staff/ranked.js";
import type * as actions_stats_cache from "../actions/stats/cache.js";
import type * as actions_users from "../actions/users.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as migrations_stats_game from "../migrations/stats/game.js";
import type * as migrations_stats_session from "../migrations/stats/session.js";
import type * as mutations_billing_catalog from "../mutations/billing/catalog.js";
import type * as mutations_billing_state from "../mutations/billing/state.js";
import type * as mutations_chatgpt from "../mutations/chatgpt.js";
import type * as mutations_creatorTools_playingWithViewers_notifications from "../mutations/creatorTools/playingWithViewers/notifications.js";
import type * as mutations_creatorTools_playingWithViewers_queue from "../mutations/creatorTools/playingWithViewers/queue.js";
import type * as mutations_creator_account from "../mutations/creator/account.js";
import type * as mutations_creator_attribution from "../mutations/creator/attribution.js";
import type * as mutations_creator_internal from "../mutations/creator/internal.js";
import type * as mutations_featureFlags_internal from "../mutations/featureFlags/internal.js";
import type * as mutations_migrations_playingWithViewers from "../mutations/migrations/playingWithViewers.js";
import type * as mutations_oauth from "../mutations/oauth.js";
import type * as mutations_staff_internal from "../mutations/staff/internal.js";
import type * as mutations_staff_management from "../mutations/staff/management.js";
import type * as mutations_stats_dashboard from "../mutations/stats/dashboard.js";
import type * as mutations_stats_games from "../mutations/stats/games.js";
import type * as mutations_stats_landingMetrics from "../mutations/stats/landingMetrics.js";
import type * as mutations_stats_sessions from "../mutations/stats/sessions.js";
import type * as mutations_users from "../mutations/users.js";
import type * as queries_billing_catalog from "../queries/billing/catalog.js";
import type * as queries_billing_center from "../queries/billing/center.js";
import type * as queries_billing_entitlements from "../queries/billing/entitlements.js";
import type * as queries_billing_internal from "../queries/billing/internal.js";
import type * as queries_billing_resolution from "../queries/billing/resolution.js";
import type * as queries_billing_state from "../queries/billing/state.js";
import type * as queries_chatgpt from "../queries/chatgpt.js";
import type * as queries_creatorTools_playingWithViewers_notifications from "../queries/creatorTools/playingWithViewers/notifications.js";
import type * as queries_creatorTools_playingWithViewers_queue from "../queries/creatorTools/playingWithViewers/queue.js";
import type * as queries_creatorTools_playingWithViewers_twitch from "../queries/creatorTools/playingWithViewers/twitch.js";
import type * as queries_creator_attribution from "../queries/creator/attribution.js";
import type * as queries_creator_dashboard from "../queries/creator/dashboard.js";
import type * as queries_creator_internal from "../queries/creator/internal.js";
import type * as queries_featureFlags_internal from "../queries/featureFlags/internal.js";
import type * as queries_oauth from "../queries/oauth.js";
import type * as queries_staff_internal from "../queries/staff/internal.js";
import type * as queries_stats_daily from "../queries/stats/daily.js";
import type * as queries_stats_dashboard from "../queries/stats/dashboard.js";
import type * as queries_stats_games from "../queries/stats/games.js";
import type * as queries_stats_landing from "../queries/stats/landing.js";
import type * as queries_stats_sessions from "../queries/stats/sessions.js";
import type * as queries_users from "../queries/users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/billing/customer": typeof actions_billing_customer;
  "actions/billing/syncCatalogToStripe": typeof actions_billing_syncCatalogToStripe;
  "actions/creatorTools/playingWithViewers/discord": typeof actions_creatorTools_playingWithViewers_discord;
  "actions/creatorTools/playingWithViewers/queue": typeof actions_creatorTools_playingWithViewers_queue;
  "actions/creatorTools/playingWithViewers/twitch": typeof actions_creatorTools_playingWithViewers_twitch;
  "actions/creator/attribution": typeof actions_creator_attribution;
  "actions/creator/connect": typeof actions_creator_connect;
  "actions/discord/registerCommands": typeof actions_discord_registerCommands;
  "actions/featureFlags/sync": typeof actions_featureFlags_sync;
  "actions/migrations/playingWithViewers": typeof actions_migrations_playingWithViewers;
  "actions/staff/billing": typeof actions_staff_billing;
  "actions/staff/management": typeof actions_staff_management;
  "actions/staff/overview": typeof actions_staff_overview;
  "actions/staff/ranked": typeof actions_staff_ranked;
  "actions/stats/cache": typeof actions_stats_cache;
  "actions/users": typeof actions_users;
  crons: typeof crons;
  http: typeof http;
  "migrations/stats/game": typeof migrations_stats_game;
  "migrations/stats/session": typeof migrations_stats_session;
  "mutations/billing/catalog": typeof mutations_billing_catalog;
  "mutations/billing/state": typeof mutations_billing_state;
  "mutations/chatgpt": typeof mutations_chatgpt;
  "mutations/creatorTools/playingWithViewers/notifications": typeof mutations_creatorTools_playingWithViewers_notifications;
  "mutations/creatorTools/playingWithViewers/queue": typeof mutations_creatorTools_playingWithViewers_queue;
  "mutations/creator/account": typeof mutations_creator_account;
  "mutations/creator/attribution": typeof mutations_creator_attribution;
  "mutations/creator/internal": typeof mutations_creator_internal;
  "mutations/featureFlags/internal": typeof mutations_featureFlags_internal;
  "mutations/migrations/playingWithViewers": typeof mutations_migrations_playingWithViewers;
  "mutations/oauth": typeof mutations_oauth;
  "mutations/staff/internal": typeof mutations_staff_internal;
  "mutations/staff/management": typeof mutations_staff_management;
  "mutations/stats/dashboard": typeof mutations_stats_dashboard;
  "mutations/stats/games": typeof mutations_stats_games;
  "mutations/stats/landingMetrics": typeof mutations_stats_landingMetrics;
  "mutations/stats/sessions": typeof mutations_stats_sessions;
  "mutations/users": typeof mutations_users;
  "queries/billing/catalog": typeof queries_billing_catalog;
  "queries/billing/center": typeof queries_billing_center;
  "queries/billing/entitlements": typeof queries_billing_entitlements;
  "queries/billing/internal": typeof queries_billing_internal;
  "queries/billing/resolution": typeof queries_billing_resolution;
  "queries/billing/state": typeof queries_billing_state;
  "queries/chatgpt": typeof queries_chatgpt;
  "queries/creatorTools/playingWithViewers/notifications": typeof queries_creatorTools_playingWithViewers_notifications;
  "queries/creatorTools/playingWithViewers/queue": typeof queries_creatorTools_playingWithViewers_queue;
  "queries/creatorTools/playingWithViewers/twitch": typeof queries_creatorTools_playingWithViewers_twitch;
  "queries/creator/attribution": typeof queries_creator_attribution;
  "queries/creator/dashboard": typeof queries_creator_dashboard;
  "queries/creator/internal": typeof queries_creator_internal;
  "queries/featureFlags/internal": typeof queries_featureFlags_internal;
  "queries/oauth": typeof queries_oauth;
  "queries/staff/internal": typeof queries_staff_internal;
  "queries/stats/daily": typeof queries_stats_daily;
  "queries/stats/dashboard": typeof queries_stats_dashboard;
  "queries/stats/games": typeof queries_stats_games;
  "queries/stats/landing": typeof queries_stats_landing;
  "queries/stats/sessions": typeof queries_stats_sessions;
  "queries/users": typeof queries_users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
