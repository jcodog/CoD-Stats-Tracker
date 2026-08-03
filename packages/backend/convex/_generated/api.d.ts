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
import type * as actions_creator_attribution_apply from "../actions/creator/attribution/apply.js";
import type * as actions_creator_connect_onboarding from "../actions/creator/connect/onboarding.js";
import type * as actions_creator_payouts_execution from "../actions/creator/payouts/execution.js";
import type * as actions_creator_payouts_scheduled from "../actions/creator/payouts/scheduled.js";
import type * as actions_creatorTools_playingWithViewers_discord from "../actions/creatorTools/playingWithViewers/discord.js";
import type * as actions_creatorTools_playingWithViewers_queue from "../actions/creatorTools/playingWithViewers/queue.js";
import type * as actions_creatorTools_playingWithViewers_twitch from "../actions/creatorTools/playingWithViewers/twitch.js";
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
import type * as lib_stripe_helpers_checkout from "../lib/stripe/helpers/checkout.js";
import type * as lib_stripe_helpers_creatorDiscounts from "../lib/stripe/helpers/creatorDiscounts.js";
import type * as lib_stripe_helpers_errors from "../lib/stripe/helpers/errors.js";
import type * as lib_stripe_helpers_fxQuotes from "../lib/stripe/helpers/fxQuotes.js";
import type * as lib_stripe_helpers_portal from "../lib/stripe/helpers/portal.js";
import type * as migrations_stats_game from "../migrations/stats/game.js";
import type * as migrations_stats_session from "../migrations/stats/session.js";
import type * as mutations_billing_catalog from "../mutations/billing/catalog.js";
import type * as mutations_billing_state from "../mutations/billing/state.js";
import type * as mutations_chatgpt from "../mutations/chatgpt.js";
import type * as mutations_creator_accounts_internal from "../mutations/creator/accounts/internal.js";
import type * as mutations_creator_accounts_settings from "../mutations/creator/accounts/settings.js";
import type * as mutations_creator_attribution_lifecycle from "../mutations/creator/attribution/lifecycle.js";
import type * as mutations_creator_program_defaults from "../mutations/creator/program/defaults.js";
import type * as mutations_creatorTools_playingWithViewers_notifications from "../mutations/creatorTools/playingWithViewers/notifications.js";
import type * as mutations_creatorTools_playingWithViewers_queue from "../mutations/creatorTools/playingWithViewers/queue.js";
import type * as mutations_featureFlags_internal from "../mutations/featureFlags/internal.js";
import type * as mutations_migrations_playingWithViewers from "../mutations/migrations/playingWithViewers.js";
import type * as mutations_oauth from "../mutations/oauth.js";
import type * as mutations_staff_internal from "../mutations/staff/internal.js";
import type * as mutations_staff_management from "../mutations/staff/management.js";
import type * as mutations_staff_payouts from "../mutations/staff/payouts.js";
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
import type * as queries_creator_accounts_internal from "../queries/creator/accounts/internal.js";
import type * as queries_creator_attribution_internal from "../queries/creator/attribution/internal.js";
import type * as queries_creator_attribution_public from "../queries/creator/attribution/public.js";
import type * as queries_creator_dashboard_current from "../queries/creator/dashboard/current.js";
import type * as queries_creator_identity_internal from "../queries/creator/identity/internal.js";
import type * as queries_creator_program_internal from "../queries/creator/program/internal.js";
import type * as queries_creatorTools_playingWithViewers_notifications from "../queries/creatorTools/playingWithViewers/notifications.js";
import type * as queries_creatorTools_playingWithViewers_queue from "../queries/creatorTools/playingWithViewers/queue.js";
import type * as queries_creatorTools_playingWithViewers_twitch from "../queries/creatorTools/playingWithViewers/twitch.js";
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
  "actions/creator/attribution/apply": typeof actions_creator_attribution_apply;
  "actions/creator/connect/onboarding": typeof actions_creator_connect_onboarding;
  "actions/creator/payouts/execution": typeof actions_creator_payouts_execution;
  "actions/creator/payouts/scheduled": typeof actions_creator_payouts_scheduled;
  "actions/creatorTools/playingWithViewers/discord": typeof actions_creatorTools_playingWithViewers_discord;
  "actions/creatorTools/playingWithViewers/queue": typeof actions_creatorTools_playingWithViewers_queue;
  "actions/creatorTools/playingWithViewers/twitch": typeof actions_creatorTools_playingWithViewers_twitch;
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
  "lib/stripe/helpers/checkout": typeof lib_stripe_helpers_checkout;
  "lib/stripe/helpers/creatorDiscounts": typeof lib_stripe_helpers_creatorDiscounts;
  "lib/stripe/helpers/errors": typeof lib_stripe_helpers_errors;
  "lib/stripe/helpers/fxQuotes": typeof lib_stripe_helpers_fxQuotes;
  "lib/stripe/helpers/portal": typeof lib_stripe_helpers_portal;
  "migrations/stats/game": typeof migrations_stats_game;
  "migrations/stats/session": typeof migrations_stats_session;
  "mutations/billing/catalog": typeof mutations_billing_catalog;
  "mutations/billing/state": typeof mutations_billing_state;
  "mutations/chatgpt": typeof mutations_chatgpt;
  "mutations/creator/accounts/internal": typeof mutations_creator_accounts_internal;
  "mutations/creator/accounts/settings": typeof mutations_creator_accounts_settings;
  "mutations/creator/attribution/lifecycle": typeof mutations_creator_attribution_lifecycle;
  "mutations/creator/program/defaults": typeof mutations_creator_program_defaults;
  "mutations/creatorTools/playingWithViewers/notifications": typeof mutations_creatorTools_playingWithViewers_notifications;
  "mutations/creatorTools/playingWithViewers/queue": typeof mutations_creatorTools_playingWithViewers_queue;
  "mutations/featureFlags/internal": typeof mutations_featureFlags_internal;
  "mutations/migrations/playingWithViewers": typeof mutations_migrations_playingWithViewers;
  "mutations/oauth": typeof mutations_oauth;
  "mutations/staff/internal": typeof mutations_staff_internal;
  "mutations/staff/management": typeof mutations_staff_management;
  "mutations/staff/payouts": typeof mutations_staff_payouts;
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
  "queries/creator/accounts/internal": typeof queries_creator_accounts_internal;
  "queries/creator/attribution/internal": typeof queries_creator_attribution_internal;
  "queries/creator/attribution/public": typeof queries_creator_attribution_public;
  "queries/creator/dashboard/current": typeof queries_creator_dashboard_current;
  "queries/creator/identity/internal": typeof queries_creator_identity_internal;
  "queries/creator/program/internal": typeof queries_creator_program_internal;
  "queries/creatorTools/playingWithViewers/notifications": typeof queries_creatorTools_playingWithViewers_notifications;
  "queries/creatorTools/playingWithViewers/queue": typeof queries_creatorTools_playingWithViewers_queue;
  "queries/creatorTools/playingWithViewers/twitch": typeof queries_creatorTools_playingWithViewers_twitch;
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
