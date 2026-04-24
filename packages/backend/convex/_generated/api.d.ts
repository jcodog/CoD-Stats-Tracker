/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: {
  actions: {
    billing: {
      customer: {
        abandonPendingCheckout: FunctionReference<"action", "public", {}, any>;
        cancelCurrentSubscription: FunctionReference<
          "action",
          "public",
          { mode: "immediately" | "period_end"; stripeSubscriptionId?: string },
          any
        >;
        changeSubscriptionPlan: FunctionReference<
          "action",
          "public",
          {
            interval: "month" | "year";
            planKey: string;
            prorationDate?: number;
            stripeSubscriptionId?: string;
          },
          any
        >;
        createPaymentMethodSetupIntent: FunctionReference<
          "action",
          "public",
          {},
          any
        >;
        createSubscriptionCheckoutSession: FunctionReference<
          "action",
          "public",
          {
            creatorCode?: string;
            interval: "month" | "year";
            planKey: string;
            preferredCurrency?: "GBP" | "USD" | "CAD" | "EUR";
          },
          any
        >;
        createSubscriptionIntent: FunctionReference<
          "action",
          "public",
          {
            attemptKey?: string;
            creatorCode?: string;
            interval: "month" | "year";
            planKey: string;
            preferredCurrency?: "GBP" | "USD" | "CAD" | "EUR";
          },
          any
        >;
        getPublicPricingCatalog: FunctionReference<
          "action",
          "public",
          { preferredCurrency?: "GBP" | "USD" | "CAD" | "EUR" },
          any
        >;
        previewCheckoutQuote: FunctionReference<
          "action",
          "public",
          {
            creatorCode?: string;
            interval: "month" | "year";
            planKey: string;
            preferredCurrency?: "GBP" | "USD" | "CAD" | "EUR";
          },
          any
        >;
        previewSubscriptionChange: FunctionReference<
          "action",
          "public",
          {
            interval: "month" | "year";
            planKey: string;
            prorationDate?: number;
            stripeSubscriptionId?: string;
          },
          any
        >;
        reactivateCurrentSubscription: FunctionReference<
          "action",
          "public",
          { stripeSubscriptionId?: string },
          any
        >;
        removePaymentMethod: FunctionReference<
          "action",
          "public",
          { paymentMethodId: string },
          any
        >;
        setDefaultPaymentMethod: FunctionReference<
          "action",
          "public",
          { paymentMethodId: string },
          any
        >;
        syncBillingCenter: FunctionReference<"action", "public", {}, any>;
        syncCheckoutSessionCompletion: FunctionReference<
          "action",
          "public",
          { sessionId: string },
          any
        >;
        updateBillingProfile: FunctionReference<
          "action",
          "public",
          {
            address?: {
              city?: string;
              country?: string;
              line1?: string;
              line2?: string;
              postalCode?: string;
              state?: string;
            };
            businessName?: string;
            email?: string;
            name?: string;
            phone?: string;
          },
          any
        >;
      };
    };
    creator: {
      attribution: {
        applyCreatorCode: FunctionReference<
          "action",
          "public",
          { code: string; source: "cookie" | "manual" },
          any
        >;
      };
      connect: {
        startHostedOnboarding: FunctionReference<"action", "public", {}, any>;
        syncCurrentCreatorConnectAccount: FunctionReference<
          "action",
          "public",
          {},
          any
        >;
      };
    };
    creatorTools: {
      playingWithViewers: {
        discord: {
          createQueueInOwnedGuild: FunctionReference<
            "action",
            "public",
            {
              creatorDisplayName: string;
              creatorMessage?: string;
              gameLabel: string;
              guildId: string;
              inviteMode: "bot_dm" | "manual_creator_contact";
              matchesPerViewer: number;
              maxRank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250";
              minRank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250";
              playersPerBatch: number;
              rulesText?: string;
              title: string;
            },
            any
          >;
          fixQueueChannelPermissions: FunctionReference<
            "action",
            "public",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          listAvailableDiscordGuilds: FunctionReference<
            "action",
            "public",
            {},
            any
          >;
          publishQueueMessage: FunctionReference<
            "action",
            "public",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          syncQueueDiscordContext: FunctionReference<
            "action",
            "public",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          updateQueueMessage: FunctionReference<
            "action",
            "public",
            { queueId: Id<"viewerQueues"> },
            any
          >;
        };
        queue: {
          clearQueue: FunctionReference<
            "action",
            "public",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          inviteQueueEntryNowAndNotify: FunctionReference<
            "action",
            "public",
            {
              entryId: Id<"viewerQueueEntries">;
              inviteCode?: string;
              inviteCodeType?: "party_code" | "private_match_code";
            },
            any
          >;
          removeQueueEntry: FunctionReference<
            "action",
            "public",
            { entryId: Id<"viewerQueueEntries"> },
            any
          >;
          selectNextBatchAndNotify: FunctionReference<
            "action",
            "public",
            {
              inviteCode?: string;
              inviteCodeType?: "party_code" | "private_match_code";
              queueId: Id<"viewerQueues">;
            },
            any
          >;
          setQueueActive: FunctionReference<
            "action",
            "public",
            { isActive: boolean; queueId: Id<"viewerQueues"> },
            any
          >;
          updateQueueSettings: FunctionReference<
            "action",
            "public",
            {
              creatorDisplayName: string;
              creatorMessage?: string;
              gameLabel: string;
              inviteMode: "bot_dm" | "manual_creator_contact";
              matchesPerViewer: number;
              maxRank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250";
              minRank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250";
              playersPerBatch: number;
              queueId: Id<"viewerQueues">;
              rulesText?: string;
              title: string;
            },
            any
          >;
        };
        twitch: {
          deferNotificationFromWorker: FunctionReference<
            "action",
            "public",
            {
              nextAttemptAt: number;
              notificationFailureReason?: string;
              notificationId: Id<"viewerQueueNotifications">;
              workerSecret: string;
            },
            any
          >;
          enqueueViewerFromWorker: FunctionReference<
            "action",
            "public",
            {
              avatarUrl?: string;
              displayName: string;
              queueId: Id<"viewerQueues">;
              rank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250"
                | "unknown";
              twitchLogin: string;
              twitchUserId: string;
              workerSecret: string;
            },
            any
          >;
          leaveViewerFromWorker: FunctionReference<
            "action",
            "public",
            {
              queueId: Id<"viewerQueues">;
              twitchUserId: string;
              workerSecret: string;
            },
            any
          >;
          recordNotificationResultFromWorker: FunctionReference<
            "action",
            "public",
            {
              notificationFailureReason?: string;
              notificationId: Id<"viewerQueueNotifications">;
              notificationMethod:
                | "discord_dm"
                | "twitch_whisper"
                | "twitch_chat_fallback"
                | "manual_creator_contact";
              notificationStatus: "sent" | "failed";
              workerSecret: string;
            },
            any
          >;
        };
      };
    };
    discord: {
      registerCommands: {
        registerDiscordCommands: FunctionReference<
          "action",
          "public",
          { guildId?: string; scope: "guild" | "global" },
          any
        >;
      };
    };
    migrations: {
      playingWithViewers: {
        runLegacyViewerQueueSchemaMigration: FunctionReference<
          "action",
          "public",
          { confirm: string; dryRun?: boolean },
          any
        >;
        runViewerQueueInviteModeMigration: FunctionReference<
          "action",
          "public",
          { confirm: string; dryRun?: boolean },
          any
        >;
        runViewerQueueTwitchDisableMigration: FunctionReference<
          "action",
          "public",
          { confirm: string; dryRun?: boolean },
          any
        >;
      };
    };
    staff: {
      billing: {
        archiveFeature: FunctionReference<
          "action",
          "public",
          { confirmationToken: string; featureKey: string },
          any
        >;
        archivePlan: FunctionReference<
          "action",
          "public",
          {
            cancelAtPeriodEnd: boolean;
            confirmationToken: string;
            planKey: string;
          },
          any
        >;
        backfillCreatorGrantStripeSubscriptions: FunctionReference<
          "action",
          "public",
          {},
          any
        >;
        getDashboard: FunctionReference<"action", "public", {}, any>;
        getWebhookDashboard: FunctionReference<"action", "public", {}, any>;
        getWebhookEventDetail: FunctionReference<
          "action",
          "public",
          { eventId: Id<"billingWebhookEvents"> },
          any
        >;
        grantCreatorAccess: FunctionReference<
          "action",
          "public",
          {
            endsAt?: number;
            planKey: string;
            reason: string;
            targetUserId: Id<"users">;
          },
          any
        >;
        prepareCreatorProgramConnectAccount: FunctionReference<
          "action",
          "public",
          { targetUserId: Id<"users"> },
          any
        >;
        previewFeatureArchive: FunctionReference<
          "action",
          "public",
          { featureKey: string },
          any
        >;
        previewFeatureAssignmentChange: FunctionReference<
          "action",
          "public",
          { enabled: boolean; featureKey: string; planKey: string },
          any
        >;
        previewFeatureAssignmentSync: FunctionReference<
          "action",
          "public",
          { featureKey: string; planKeys: Array<string> },
          any
        >;
        previewPlanArchive: FunctionReference<
          "action",
          "public",
          { planKey: string },
          any
        >;
        previewPlanFeatureSync: FunctionReference<
          "action",
          "public",
          { featureKeys: Array<string>; planKey: string },
          any
        >;
        previewPriceReplacement: FunctionReference<
          "action",
          "public",
          { interval: "month" | "year"; planKey: string },
          any
        >;
        refreshCreatorProgramConnectStatus: FunctionReference<
          "action",
          "public",
          { targetUserId: Id<"users"> },
          any
        >;
        refreshWebhookLedger: FunctionReference<"action", "public", {}, any>;
        replacePlanPrice: FunctionReference<
          "action",
          "public",
          {
            amount: number;
            confirmationToken: string;
            interval: "month" | "year";
            planKey: string;
          },
          any
        >;
        revokeCreatorAccess: FunctionReference<
          "action",
          "public",
          { reason: string; targetUserId: Id<"users"> },
          any
        >;
        runCatalogSync: FunctionReference<"action", "public", {}, any>;
        setFeatureAssignment: FunctionReference<
          "action",
          "public",
          { enabled: boolean; featureKey: string; planKey: string },
          any
        >;
        syncFeatureAssignments: FunctionReference<
          "action",
          "public",
          { featureKey: string; planKeys: Array<string> },
          any
        >;
        upsertCreatorProgramAccount: FunctionReference<
          "action",
          "public",
          {
            code: string;
            codeActive: boolean;
            country: string;
            discountPercent: number;
            payoutEligible: boolean;
            payoutPercent: number;
            targetUserId: Id<"users">;
          },
          any
        >;
        upsertCreatorProgramDefaults: FunctionReference<
          "action",
          "public",
          {
            defaultCodeActive: boolean;
            defaultCountry: string;
            defaultDiscountPercent: number;
            defaultPayoutEligible: boolean;
            defaultPayoutPercent: number;
          },
          any
        >;
        upsertFeature: FunctionReference<
          "action",
          "public",
          {
            active: boolean;
            appliesTo: "entitlement" | "marketing" | "both";
            category?: string;
            description: string;
            key: string;
            name: string;
            sortOrder: number;
          },
          any
        >;
        upsertPlan: FunctionReference<
          "action",
          "public",
          {
            active: boolean;
            currency: string;
            description: string;
            featureKeys: Array<string>;
            key: string;
            monthlyPriceAmount: number;
            name: string;
            planType: "free" | "paid";
            sortOrder: number;
            yearlyPriceAmount: number;
          },
          any
        >;
      };
      management: {
        banUser: FunctionReference<
          "action",
          "public",
          { targetClerkUserId: string },
          any
        >;
        getDashboard: FunctionReference<"action", "public", {}, any>;
        updateUserRole: FunctionReference<
          "action",
          "public",
          { nextRole: "user" | "staff" | "admin"; targetClerkUserId: string },
          any
        >;
      };
      overview: {
        getDashboard: FunctionReference<"action", "public", {}, any>;
      };
      ranked: {
        getDashboard: FunctionReference<"action", "public", {}, any>;
        setCurrentRankedConfig: FunctionReference<
          "action",
          "public",
          {
            activeSeason: number;
            activeTitleKey: string;
            sessionWritesEnabled: boolean;
          },
          any
        >;
        upsertRankedMap: FunctionReference<
          "action",
          "public",
          {
            isActive: boolean;
            mapId?: Id<"rankedMaps">;
            name: string;
            sortOrder: number;
            supportedModeIds: Array<Id<"rankedModes">>;
            titleKey: string;
          },
          any
        >;
        upsertRankedMode: FunctionReference<
          "action",
          "public",
          {
            isActive: boolean;
            key: string;
            label: string;
            modeId?: Id<"rankedModes">;
            sortOrder: number;
            titleKey: string;
          },
          any
        >;
        upsertRankedTitle: FunctionReference<
          "action",
          "public",
          { isActive: boolean; key: string; label: string; sortOrder: number },
          any
        >;
      };
    };
  };
  migrations: {
    stats: {
      game: {
        importGame: FunctionReference<
          "mutation",
          "public",
          {
            createdAt: number;
            deaths: number;
            defuses?: null | number;
            enemyScore?: null | number;
            hillTimeSeconds?: null | number;
            kills: number;
            lossProtected: boolean;
            mode: "hardpoint" | "snd" | "overload";
            outcome: "win" | "loss";
            overloads?: null | number;
            plants?: null | number;
            sessionId: string;
            srChange: number;
            teamScore?: null | number;
            userId: string;
          },
          any
        >;
      };
      session: {
        importSession: FunctionReference<
          "mutation",
          "public",
          {
            bestStreak: number;
            codTitle: string;
            currentSr: number;
            deaths: number;
            endedAt: null | number;
            kills: number;
            losses: number;
            season: number;
            startSr: number;
            startedAt: number;
            streak: number;
            userId: string;
            uuid: string;
            wins: number;
          },
          any
        >;
      };
    };
  };
  mutations: {
    chatgpt: {
      disconnectByUserId: FunctionReference<
        "mutation",
        "public",
        { userId: Id<"users"> },
        any
      >;
      touchConnectionLastUsedAt: FunctionReference<
        "mutation",
        "public",
        { userId: Id<"users"> },
        any
      >;
    };
    creator: {
      account: {
        setCurrentCreatorCodeActiveState: FunctionReference<
          "mutation",
          "public",
          { codeActive: boolean },
          any
        >;
      };
    };
    oauth: {
      createAuthorizationCode: FunctionReference<
        "mutation",
        "public",
        {
          clientId: string;
          codeChallenge?: string;
          codeChallengeMethod?: "S256";
          codeHash: string;
          expiresAt: number;
          redirectUri: string;
          resource: string;
          scopes: Array<string>;
          sessionId: string;
          stateHash: string;
        },
        any
      >;
      exchangeAuthorizationCode: FunctionReference<
        "mutation",
        "public",
        {
          clientId: string;
          codeHash: string;
          codeVerifierHash?: string;
          redirectUri: string;
          refreshTokenExpiresAt: number;
          refreshTokenHash: string;
          requestedScopes?: Array<string>;
          resource: string;
        },
        any
      >;
      registerClient: FunctionReference<
        "mutation",
        "public",
        {
          clientId: string;
          clientName?: string;
          clientSecretHash?: string;
          clientUri?: string;
          grantTypes: Array<string>;
          redirectUris: Array<string>;
          responseTypes: Array<string>;
          scope?: string;
          tokenEndpointAuthMethod:
            | "none"
            | "client_secret_post"
            | "client_secret_basic";
        },
        any
      >;
      revokeByRefreshToken: FunctionReference<
        "mutation",
        "public",
        { clientId: string; refreshTokenHash: string },
        any
      >;
      revokeForCurrentUser: FunctionReference<"mutation", "public", {}, any>;
      rotateRefreshToken: FunctionReference<
        "mutation",
        "public",
        {
          clientId: string;
          newRefreshTokenExpiresAt: number;
          newRefreshTokenHash: string;
          refreshTokenHash: string;
          requestedScopes?: Array<string>;
          resource: string;
        },
        any
      >;
    };
    stats: {
      dashboard: {
        createSession: FunctionReference<
          "mutation",
          "public",
          {
            existingUsernameId?: Id<"activisionUsernames">;
            newUsername?: string;
            startSr: number;
          },
          any
        >;
        logMatch: FunctionReference<
          "mutation",
          "public",
          {
            deaths?: null | number;
            defuses?: null | number;
            enemyScore?: null | number;
            hillTimeSeconds?: null | number;
            kills?: null | number;
            lossProtected?: boolean;
            mapId: Id<"rankedMaps">;
            modeId: Id<"rankedModes">;
            notes?: string;
            outcome: "win" | "loss";
            overloads?: null | number;
            plants?: null | number;
            sessionId: Id<"sessions">;
            srChange: number;
            teamScore?: null | number;
          },
          any
        >;
        updatePreferredMatchLoggingMode: FunctionReference<
          "mutation",
          "public",
          { preferredMatchLoggingMode: "basic" | "comprehensive" },
          any
        >;
      };
      games: {
        logMatch: FunctionReference<
          "mutation",
          "public",
          {
            deaths: number;
            defuses?: null | number;
            enemyScore?: null | number;
            hillTimeSeconds?: null | number;
            kills: number;
            lossProtected: boolean;
            mode: "hardpoint" | "snd" | "overload";
            outcome: "win" | "loss";
            overloads?: null | number;
            plants?: null | number;
            sessionUuid: string;
            srChange: number;
            teamScore?: null | number;
          },
          any
        >;
      };
      sessions: {
        createSession: FunctionReference<
          "mutation",
          "public",
          {
            codTitle: string;
            season: number;
            startSr: number;
            userId: string;
            uuid: string;
          },
          any
        >;
      };
    };
  };
  queries: {
    billing: {
      catalog: {
        getCustomerPricingCatalog: FunctionReference<
          "query",
          "public",
          { preferredCurrency?: string },
          any
        >;
        getPublicPricingCatalog: FunctionReference<
          "query",
          "public",
          { preferredCurrency?: string },
          any
        >;
      };
      center: {
        getCurrentUserBillingCenter: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
      };
      entitlements: {
        currentUserHasFeature: FunctionReference<
          "query",
          "public",
          { featureKey: string },
          any
        >;
        getCurrentUserEntitlements: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
      };
      resolution: {
        getCurrentUserResolvedBillingState: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
      };
      state: {
        getCurrentUserBillingCustomer: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
        getCurrentUserBillingState: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
        getCurrentUserSubscription: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
      };
    };
    chatgpt: {
      getActiveSessionByDiscordId: FunctionReference<
        "query",
        "public",
        { discordId: string },
        any
      >;
      getDailyStatsByDiscordId: FunctionReference<
        "query",
        "public",
        { date: string; discordId: string },
        any
      >;
      getLastCompletedSessionByDiscordId: FunctionReference<
        "query",
        "public",
        { discordId: string },
        any
      >;
      getMatchById: FunctionReference<
        "query",
        "public",
        { discordId: string; matchId: string },
        any
      >;
      getMatchesByDiscordIdPaginated: FunctionReference<
        "query",
        "public",
        {
          discordId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        any
      >;
      getRecentStatsByDiscordId: FunctionReference<
        "query",
        "public",
        { discordId: string; limit: number },
        any
      >;
      getStatsSummaryByDiscordId: FunctionReference<
        "query",
        "public",
        { discordId: string },
        any
      >;
      getUserByOAuthSubject: FunctionReference<
        "query",
        "public",
        { sub: string },
        any
      >;
    };
    creator: {
      attribution: {
        getCurrentUserAttribution: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
        getPublicCreatorCodeSummary: FunctionReference<
          "query",
          "public",
          { code: string },
          any
        >;
      };
      dashboard: {
        getCurrentCreatorDashboard: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
        getCurrentCreatorWorkspaceState: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
      };
    };
    creatorTools: {
      playingWithViewers: {
        queue: {
          getCurrentCreatorQueue: FunctionReference<"query", "public", {}, any>;
          getCurrentCreatorQueueEntries: FunctionReference<
            "query",
            "public",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          getQueueRoundById: FunctionReference<
            "query",
            "public",
            { roundId: Id<"viewerQueueRounds"> },
            any
          >;
        };
        twitch: {
          getEnabledQueuesForWorker: FunctionReference<
            "query",
            "public",
            { workerSecret: string },
            any
          >;
          getPendingNotificationsForWorker: FunctionReference<
            "query",
            "public",
            { limit?: number; workerSecret: string },
            any
          >;
          getQueueSnapshotForWorker: FunctionReference<
            "query",
            "public",
            {
              platform: "discord" | "twitch";
              platformUserId?: string;
              queueId: Id<"viewerQueues">;
              workerSecret: string;
            },
            any
          >;
        };
      };
    };
    oauth: {
      getClientByClientId: FunctionReference<
        "query",
        "public",
        { clientId: string },
        any
      >;
    };
    stats: {
      daily: {
        getDailyGamesForSession: FunctionReference<
          "query",
          "public",
          { includeLossProtected: boolean; sessionId: string },
          any
        >;
      };
      dashboard: {
        getAvailableActivisionUsernames: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
        getAvailableMapsForCurrentTitle: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
        getAvailableModesForCurrentTitle: FunctionReference<
          "query",
          "public",
          {},
          any
        >;
        getCurrentDashboardState: FunctionReference<"query", "public", {}, any>;
        getRecentSessionMatches: FunctionReference<
          "query",
          "public",
          {
            includeLossProtected: boolean;
            limit?: number;
            sessionId: Id<"sessions">;
          },
          any
        >;
        getSessionDailyPerformance: FunctionReference<
          "query",
          "public",
          { includeLossProtected: boolean; sessionId: Id<"sessions"> },
          any
        >;
        getSessionOverview: FunctionReference<
          "query",
          "public",
          { includeLossProtected: boolean; sessionId: Id<"sessions"> },
          any
        >;
        getSessionSrTimeline: FunctionReference<
          "query",
          "public",
          { includeLossProtected: boolean; sessionId: Id<"sessions"> },
          any
        >;
        getSessionWinLossBreakdown: FunctionReference<
          "query",
          "public",
          { includeLossProtected: boolean; sessionId: Id<"sessions"> },
          any
        >;
      };
      games: {
        getGamesForSession: FunctionReference<
          "query",
          "public",
          { sessionId: string },
          any
        >;
        getSessionGamesWindow: FunctionReference<
          "query",
          "public",
          {
            filter: "all" | "wins" | "losses" | "no_loss_protection";
            from?: number;
            limit: number;
            sessionId: string;
            to?: number;
            userId: string;
          },
          any
        >;
      };
      landing: {
        getLandingMetrics: FunctionReference<"query", "public", {}, any>;
      };
      sessions: {
        getSessionAggregatedStats: FunctionReference<
          "query",
          "public",
          { includeLossProtected: boolean; sessionId: string },
          any
        >;
        getSessionForUser: FunctionReference<
          "query",
          "public",
          { codSeason: number; codTitle: string; userId: string },
          any
        >;
        getSessionsForUser: FunctionReference<
          "query",
          "public",
          {
            codSeason: number;
            codTitle: string;
            limit?: number;
            userId: string;
          },
          any
        >;
      };
    };
    users: {
      current: FunctionReference<"query", "public", {}, any>;
    };
  };
  stats: {
    createSession: FunctionReference<
      "mutation",
      "public",
      {
        codTitle: string;
        season: number;
        startSr: number;
        userId: string;
        uuid: string;
      },
      any
    >;
    getDailyGamesForSession: FunctionReference<
      "query",
      "public",
      { includeLossProtected: boolean; sessionId: string },
      any
    >;
    getGamesForSession: FunctionReference<
      "query",
      "public",
      { sessionId: string },
      any
    >;
    getLandingMetrics: FunctionReference<"query", "public", {}, any>;
    getSessionAggregatedStats: FunctionReference<
      "query",
      "public",
      { includeLossProtected: boolean; sessionId: string },
      any
    >;
    getSessionForUser: FunctionReference<
      "query",
      "public",
      { codSeason: number; codTitle: string; userId: string },
      any
    >;
    getSessionGamesWindow: FunctionReference<
      "query",
      "public",
      {
        filter: "all" | "wins" | "losses" | "no_loss_protection";
        from?: number;
        limit: number;
        sessionId: string;
        to?: number;
        userId: string;
      },
      any
    >;
    getSessionsForUser: FunctionReference<
      "query",
      "public",
      { codSeason: number; codTitle: string; limit?: number; userId: string },
      any
    >;
    logMatch: FunctionReference<
      "mutation",
      "public",
      {
        deaths: number;
        defuses?: null | number;
        enemyScore?: null | number;
        hillTimeSeconds?: null | number;
        kills: number;
        lossProtected: boolean;
        mode: "hardpoint" | "snd" | "overload";
        outcome: "win" | "loss";
        overloads?: null | number;
        plants?: null | number;
        sessionUuid: string;
        srChange: number;
        teamScore?: null | number;
      },
      any
    >;
  };
};

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: {
  actions: {
    billing: {
      syncCatalogToStripe: {
        syncCatalogToStripe: FunctionReference<"action", "internal", {}, any>;
      };
    };
    creatorTools: {
      playingWithViewers: {
        discord: {
          deliverDiscordNotificationsForRound: FunctionReference<
            "action",
            "internal",
            { roundId: Id<"viewerQueueRounds"> },
            any
          >;
          syncQueueMessageAfterViewerInteraction: FunctionReference<
            "action",
            "internal",
            { queueId: Id<"viewerQueues"> },
            any
          >;
        };
      };
    };
    featureFlags: {
      sync: {
        syncFromVercel: FunctionReference<"action", "internal", {}, any>;
      };
    };
    stats: {
      cache: {
        invalidateLandingMetricsCache: FunctionReference<
          "action",
          "internal",
          { invalidateAll?: boolean; userId?: string },
          any
        >;
      };
    };
    users: {
      backfillConnectedAccountsFromClerk: FunctionReference<
        "action",
        "internal",
        { limit?: number },
        any
      >;
      syncProvisionedClerkRole: FunctionReference<
        "action",
        "internal",
        { data: any },
        any
      >;
    };
  };
  mutations: {
    billing: {
      catalog: {
        updateFeatureStripeId: FunctionReference<
          "mutation",
          "internal",
          { featureKey: string; stripeFeatureId: string },
          any
        >;
        updatePlanStripeIds: FunctionReference<
          "mutation",
          "internal",
          {
            monthlyPriceId?: string;
            planKey: string;
            stripeProductId?: string;
            yearlyPriceId?: string;
          },
          any
        >;
      };
      state: {
        claimWebhookEventProcessing: FunctionReference<
          "mutation",
          "internal",
          { stripeEventId: string },
          any
        >;
        clearSubscriptionScheduledChange: FunctionReference<
          "mutation",
          "internal",
          { stripeSubscriptionId: string },
          any
        >;
        deleteBillingSubscriptionsMissingFromSync: FunctionReference<
          "mutation",
          "internal",
          {
            stripeCustomerId: string;
            stripeSubscriptionIds: Array<string>;
            userId: Id<"users">;
          },
          any
        >;
        grantBillingAccessGrant: FunctionReference<
          "mutation",
          "internal",
          {
            clerkUserId: string;
            endsAt?: number;
            grantedByClerkUserId?: string;
            grantedByName?: string;
            planKey: string;
            reason: string;
            source: "creator_approval" | "manual" | "promo";
            startsAt?: number;
            userId: Id<"users">;
          },
          any
        >;
        markWebhookEventFailed: FunctionReference<
          "mutation",
          "internal",
          { errorMessage: string; stripeEventId: string },
          any
        >;
        markWebhookEventPayloadUnavailable: FunctionReference<
          "mutation",
          "internal",
          { reason?: string; stripeEventId: string },
          any
        >;
        markWebhookEventProcessed: FunctionReference<
          "mutation",
          "internal",
          { processingStatus: "processed" | "ignored"; stripeEventId: string },
          any
        >;
        recordWebhookEventReceived: FunctionReference<
          "mutation",
          "internal",
          {
            customerId?: string;
            eventType: string;
            invoiceId?: string;
            payloadJson?: string;
            paymentIntentId?: string;
            safeSummary: string;
            stripeEventId: string;
            subscriptionId?: string;
          },
          any
        >;
        revokeBillingAccessGrant: FunctionReference<
          "mutation",
          "internal",
          {
            grantId: Id<"billingAccessGrants">;
            revokedByClerkUserId?: string;
            revokedByName?: string;
          },
          any
        >;
        setSubscriptionScheduledChange: FunctionReference<
          "mutation",
          "internal",
          {
            scheduledChangeAt: number;
            scheduledChangeRequestedAt: number;
            scheduledChangeType: "cancel" | "plan_change";
            scheduledInterval?: "month" | "year";
            scheduledPlanKey?: string;
            stripeScheduleId?: string;
            stripeSubscriptionId: string;
          },
          any
        >;
        storeWebhookEventPayload: FunctionReference<
          "mutation",
          "internal",
          {
            payloadBackfilledAt?: number;
            payloadJson: string;
            stripeEventId: string;
          },
          any
        >;
        syncBillingInvoices: FunctionReference<
          "mutation",
          "internal",
          {
            clerkUserId: string;
            invoices: Array<{
              amountDue: number;
              amountPaid: number;
              amountTotal: number;
              currency: string;
              description: string;
              hostedInvoiceUrl?: string;
              invoiceIssuedAt: number;
              invoiceNumber?: string;
              invoicePdfUrl?: string;
              paymentMethodBrand?: string;
              paymentMethodLast4?: string;
              paymentMethodType?: string;
              status: string;
              stripeInvoiceId: string;
              stripeSubscriptionId?: string;
            }>;
            stripeCustomerId: string;
            userId: Id<"users">;
          },
          any
        >;
        syncBillingPaymentMethods: FunctionReference<
          "mutation",
          "internal",
          {
            clerkUserId: string;
            defaultPaymentMethodId?: string;
            paymentMethods: Array<{
              bankName?: string;
              billingAddress?: {
                city?: string;
                country?: string;
                line1?: string;
                line2?: string;
                postalCode?: string;
                state?: string;
              };
              brand?: string;
              cardholderName?: string;
              expMonth?: number;
              expYear?: number;
              last4?: string;
              stripePaymentMethodId: string;
              type: string;
            }>;
            stripeCustomerId: string;
            userId: Id<"users">;
          },
          any
        >;
        upsertBillingCustomer: FunctionReference<
          "mutation",
          "internal",
          {
            active: boolean;
            billingAddress?: {
              city?: string;
              country?: string;
              line1?: string;
              line2?: string;
              postalCode?: string;
              state?: string;
            };
            businessName?: string;
            clerkUserId: string;
            defaultPaymentMethodId?: string;
            email?: string;
            lastSyncedAt?: number;
            name?: string;
            phone?: string;
            stripeCustomerId: string;
            taxExempt?: "none" | "exempt" | "reverse";
            taxIds?: Array<{
              country?: string;
              stripeTaxIdId: string;
              type: string;
              value: string;
              verificationStatus?: string;
            }>;
            userId: Id<"users">;
          },
          any
        >;
        upsertBillingSubscription: FunctionReference<
          "mutation",
          "internal",
          {
            attentionStatus:
              | "none"
              | "payment_failed"
              | "past_due"
              | "requires_action"
              | "paused";
            attentionUpdatedAt?: number;
            cancelAt?: number;
            cancelAtPeriodEnd: boolean;
            canceledAt?: number;
            clearScheduledChange?: boolean;
            clerkUserId: string;
            currentPeriodEnd?: number;
            currentPeriodStart?: number;
            defaultPaymentMethodId?: string;
            endedAt?: number;
            interval: "month" | "year";
            lastStripeEventId?: string;
            managedGrantEndsAt?: number;
            managedGrantMode?: "timed" | "indefinite";
            managedGrantSource?: "creator_approval";
            planKey: string;
            quantity?: number;
            scheduledChangeAt?: number;
            scheduledChangeRequestedAt?: number;
            scheduledChangeType?: "cancel" | "plan_change";
            scheduledInterval?: "month" | "year";
            scheduledPlanKey?: string;
            startedAt?: number;
            status:
              | "incomplete"
              | "trialing"
              | "active"
              | "past_due"
              | "canceled"
              | "unpaid"
              | "paused"
              | "incomplete_expired";
            stripeCustomerId: string;
            stripeLatestInvoiceId?: string;
            stripeLatestPaymentIntentId?: string;
            stripePriceId: string;
            stripeProductId?: string;
            stripeScheduleId?: string;
            stripeSubscriptionId: string;
            stripeSubscriptionItemId?: string;
            trialEnd?: number;
            trialStart?: number;
            userId: Id<"users">;
          },
          any
        >;
      };
    };
    creator: {
      attribution: {
        ensureCanonicalAttribution: FunctionReference<
          "mutation",
          "internal",
          {
            clerkUserId: string;
            creatorAccountId: Id<"creatorAccounts">;
            creatorCode: string;
            normalizedCode: string;
            source: "cookie" | "manual" | "staff";
            userId: Id<"users">;
          },
          any
        >;
      };
      internal: {
        applyStripeConnectedAccountSnapshot: FunctionReference<
          "mutation",
          "internal",
          {
            chargesEnabled: boolean;
            connectStatusUpdatedAt: number;
            creatorAccountId?: Id<"creatorAccounts">;
            detailsSubmitted: boolean;
            payoutsEnabled: boolean;
            requirementsCurrentlyDue: Array<string>;
            requirementsDisabledReason?: string;
            requirementsDue: Array<string>;
            requirementsPastDue: Array<string>;
            requirementsPendingVerification: Array<string>;
            stripeConnectedAccountId: string;
            stripeConnectedAccountVersion?: "v1" | "v2";
          },
          any
        >;
        upsertCreatorAccount: FunctionReference<
          "mutation",
          "internal",
          {
            clerkUserId: string;
            code: string;
            codeActive: boolean;
            country: string;
            discountPercent: number;
            payoutEligible: boolean;
            payoutPercent: number;
            userId: Id<"users">;
          },
          any
        >;
        upsertCreatorProgramDefaults: FunctionReference<
          "mutation",
          "internal",
          {
            defaultCodeActive: boolean;
            defaultCountry: string;
            defaultDiscountPercent: number;
            defaultPayoutEligible: boolean;
            defaultPayoutPercent: number;
          },
          any
        >;
      };
    };
    creatorTools: {
      playingWithViewers: {
        notifications: {
          deferNotification: FunctionReference<
            "mutation",
            "internal",
            {
              nextAttemptAt: number;
              notificationFailureReason?: string;
              notificationId: Id<"viewerQueueNotifications">;
            },
            any
          >;
          initializeRoundNotifications: FunctionReference<
            "mutation",
            "internal",
            { roundId: Id<"viewerQueueRounds"> },
            any
          >;
          recordNotificationResult: FunctionReference<
            "mutation",
            "internal",
            {
              notificationFailureReason?: string;
              notificationId: Id<"viewerQueueNotifications">;
              notificationMethod:
                | "discord_dm"
                | "twitch_whisper"
                | "twitch_chat_fallback"
                | "manual_creator_contact";
              notificationStatus: "sent" | "failed";
            },
            any
          >;
        };
        queue: {
          clearQueue: FunctionReference<
            "mutation",
            "internal",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          clearQueueMessageMeta: FunctionReference<
            "mutation",
            "internal",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          clearQueueMessageSyncError: FunctionReference<
            "mutation",
            "internal",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          createQueue: FunctionReference<
            "mutation",
            "internal",
            {
              channelId: string;
              channelName?: string;
              channelPermsCorrect?: boolean;
              creatorDisplayName: string;
              creatorMessage?: string;
              creatorUserId: Id<"users">;
              gameLabel: string;
              guildId: string;
              guildName?: string;
              inviteMode: "bot_dm" | "manual_creator_contact";
              matchesPerViewer: number;
              maxRank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250";
              minRank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250";
              playersPerBatch: number;
              rulesText?: string;
              title: string;
              twitchBotAnnouncementsEnabled?: boolean;
              twitchBroadcasterId: string;
              twitchBroadcasterLogin: string;
              twitchCommandsEnabled?: boolean;
            },
            any
          >;
          enqueueViewer: FunctionReference<
            "mutation",
            "internal",
            {
              avatarUrl?: string;
              discordUserId: string;
              displayName: string;
              queueId: Id<"viewerQueues">;
              rank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250"
                | "unknown";
              username: string;
            },
            any
          >;
          enqueueViewerFromPlatform: FunctionReference<
            "mutation",
            "internal",
            {
              avatarUrl?: string;
              displayName: string;
              platform: "discord" | "twitch";
              platformUserId: string;
              queueId: Id<"viewerQueues">;
              rank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250"
                | "unknown";
              username: string;
            },
            any
          >;
          inviteQueueEntryNow: FunctionReference<
            "mutation",
            "internal",
            {
              entryId: Id<"viewerQueueEntries">;
              inviteCode?: string;
              inviteCodeType?: "party_code" | "private_match_code";
            },
            any
          >;
          leaveQueue: FunctionReference<
            "mutation",
            "internal",
            { discordUserId: string; queueId: Id<"viewerQueues"> },
            any
          >;
          leaveQueueFromPlatform: FunctionReference<
            "mutation",
            "internal",
            {
              platform: "discord" | "twitch";
              platformUserId: string;
              queueId: Id<"viewerQueues">;
            },
            any
          >;
          removeQueueEntry: FunctionReference<
            "mutation",
            "internal",
            { entryId: Id<"viewerQueueEntries"> },
            any
          >;
          selectNextBatch: FunctionReference<
            "mutation",
            "internal",
            {
              inviteCode?: string;
              inviteCodeType?: "party_code" | "private_match_code";
              queueId: Id<"viewerQueues">;
            },
            any
          >;
          setQueueActive: FunctionReference<
            "mutation",
            "internal",
            { isActive: boolean; queueId: Id<"viewerQueues"> },
            any
          >;
          setQueueDiscordContext: FunctionReference<
            "mutation",
            "internal",
            {
              channelId?: string;
              channelName?: string;
              channelPermsCorrect?: boolean;
              guildName?: string;
              queueId: Id<"viewerQueues">;
              resetMessageState?: boolean;
            },
            any
          >;
          setQueueMessageMeta: FunctionReference<
            "mutation",
            "internal",
            { messageId: string; queueId: Id<"viewerQueues"> },
            any
          >;
          setQueueMessageSyncError: FunctionReference<
            "mutation",
            "internal",
            { error: string; queueId: Id<"viewerQueues"> },
            any
          >;
          setQueueRoundSelectedUsers: FunctionReference<
            "mutation",
            "internal",
            {
              roundId: Id<"viewerQueueRounds">;
              selectedUsers: Array<{
                avatarUrl?: string;
                discordUserId?: string;
                displayName: string;
                dmFailureReason?: string;
                dmStatus?: "sent" | "failed";
                linkedUserId?: Id<"users">;
                notificationFailureReason?: string;
                notificationMethod?:
                  | "discord_dm"
                  | "twitch_whisper"
                  | "twitch_chat_fallback"
                  | "manual_creator_contact";
                notificationStatus?: "pending" | "sent" | "failed";
                platform: "discord" | "twitch";
                platformUserId: string;
                rank:
                  | "bronze"
                  | "silver"
                  | "gold"
                  | "platinum"
                  | "diamond"
                  | "crimson"
                  | "iridescent"
                  | "top250"
                  | "unknown";
                username: string;
              }>;
            },
            any
          >;
          setQueueTwitchContext: FunctionReference<
            "mutation",
            "internal",
            {
              queueId: Id<"viewerQueues">;
              twitchBotAnnouncementsEnabled?: boolean;
              twitchBroadcasterId: string;
              twitchBroadcasterLogin: string;
              twitchCommandsEnabled?: boolean;
            },
            any
          >;
          updateQueueSettings: FunctionReference<
            "mutation",
            "internal",
            {
              creatorDisplayName: string;
              creatorMessage?: string;
              gameLabel: string;
              inviteMode: "bot_dm" | "manual_creator_contact";
              matchesPerViewer: number;
              maxRank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250";
              minRank:
                | "bronze"
                | "silver"
                | "gold"
                | "platinum"
                | "diamond"
                | "crimson"
                | "iridescent"
                | "top250";
              playersPerBatch: number;
              queueId: Id<"viewerQueues">;
              rulesText?: string;
              title: string;
              twitchBotAnnouncementsEnabled?: boolean;
              twitchBroadcasterId?: string;
              twitchBroadcasterLogin?: string;
              twitchCommandsEnabled?: boolean;
            },
            any
          >;
        };
      };
    };
    featureFlags: {
      internal: {
        upsertFromVercel: FunctionReference<
          "mutation",
          "internal",
          {
            adminBypass: boolean;
            allowlistUserIds: Array<string>;
            creatorBypass: boolean;
            enabled: boolean;
            key: string;
            premiumBypass: boolean;
            rolloutPercent: number;
            staffBypass: boolean;
            syncedAt: number;
            syncedFrom: string;
          },
          any
        >;
      };
    };
    migrations: {
      playingWithViewers: {
        disableViewerQueueTwitchIntegration: FunctionReference<
          "mutation",
          "internal",
          { dryRun?: boolean },
          any
        >;
        migrateLegacyViewerQueueInviteModes: FunctionReference<
          "mutation",
          "internal",
          { dryRun?: boolean },
          any
        >;
        migrateLegacyViewerQueueSchema: FunctionReference<
          "mutation",
          "internal",
          { dryRun?: boolean },
          any
        >;
      };
    };
    staff: {
      internal: {
        insertAuditLog: FunctionReference<
          "mutation",
          "internal",
          {
            action: string;
            actorClerkUserId: string;
            actorName: string;
            actorRole: "user" | "staff" | "admin" | "super_admin";
            details?: string;
            entityId: string;
            entityLabel?: string;
            entityType: string;
            result: "success" | "warning" | "error";
            summary: string;
          },
          any
        >;
        setCurrentRankedConfig: FunctionReference<
          "mutation",
          "internal",
          {
            activeSeason: number;
            activeTitleKey: string;
            sessionWritesEnabled: boolean;
            updatedByUserId: Id<"users">;
          },
          any
        >;
        setFeatureActiveState: FunctionReference<
          "mutation",
          "internal",
          { active: boolean; archivedAt?: number; featureKey: string },
          any
        >;
        setPlanActiveState: FunctionReference<
          "mutation",
          "internal",
          { active: boolean; archivedAt?: number; planKey: string },
          any
        >;
        setPlanFeatureAssignment: FunctionReference<
          "mutation",
          "internal",
          { enabled: boolean; featureKey: string; planKey: string },
          any
        >;
        setUserRole: FunctionReference<
          "mutation",
          "internal",
          {
            clerkUserId: string;
            role: "user" | "staff" | "admin" | "super_admin";
          },
          any
        >;
        syncPlanFeatureAssignmentsForFeature: FunctionReference<
          "mutation",
          "internal",
          { featureKey: string; planKeys: Array<string> },
          any
        >;
        syncPlanFeatureAssignmentsForPlan: FunctionReference<
          "mutation",
          "internal",
          { featureKeys: Array<string>; planKey: string },
          any
        >;
        updateSubscriptionsAfterCancel: FunctionReference<
          "mutation",
          "internal",
          {
            updates: Array<{
              cancelAtPeriodEnd: boolean;
              canceledAt?: number;
              currentPeriodEnd?: number;
              status?:
                | "incomplete"
                | "trialing"
                | "active"
                | "past_due"
                | "canceled"
                | "unpaid"
                | "paused"
                | "incomplete_expired";
              stripeSubscriptionId: string;
            }>;
          },
          any
        >;
        upsertFeature: FunctionReference<
          "mutation",
          "internal",
          {
            active: boolean;
            appliesTo: "entitlement" | "marketing" | "both";
            category?: string;
            description: string;
            key: string;
            name: string;
            sortOrder: number;
          },
          any
        >;
        upsertPlan: FunctionReference<
          "mutation",
          "internal",
          {
            active: boolean;
            currency: string;
            description: string;
            key: string;
            monthlyPriceAmount: number;
            name: string;
            planType: "free" | "paid";
            sortOrder: number;
            yearlyPriceAmount: number;
          },
          any
        >;
        upsertRankedMap: FunctionReference<
          "mutation",
          "internal",
          {
            isActive: boolean;
            mapId?: Id<"rankedMaps">;
            name: string;
            sortOrder: number;
            supportedModeIds: Array<Id<"rankedModes">>;
            titleKey: string;
          },
          any
        >;
        upsertRankedMode: FunctionReference<
          "mutation",
          "internal",
          {
            isActive: boolean;
            key: string;
            label: string;
            modeId?: Id<"rankedModes">;
            sortOrder: number;
            titleKey: string;
          },
          any
        >;
        upsertRankedTitle: FunctionReference<
          "mutation",
          "internal",
          { isActive: boolean; key: string; label: string; sortOrder: number },
          any
        >;
      };
      management: {
        purgeBannedUserData: FunctionReference<
          "mutation",
          "internal",
          {
            targetClerkUserId: string;
            targetDiscordUserId?: string;
            targetStatsUserIds: Array<string>;
            targetUserId?: Id<"users">;
          },
          any
        >;
      };
    };
    stats: {
      landingMetrics: {
        rebuildLandingMetrics: FunctionReference<
          "mutation",
          "internal",
          {},
          any
        >;
      };
    };
    users: {
      deleteFromClerk: FunctionReference<
        "mutation",
        "internal",
        { clerkUserId: string },
        any
      >;
      syncConnectedAccountsForUser: FunctionReference<
        "mutation",
        "internal",
        {
          accounts: Array<{
            displayName?: string;
            provider: "discord" | "twitch";
            providerLogin?: string;
            providerUserId: string;
          }>;
          userId: Id<"users">;
        },
        any
      >;
      updateFromClerk: FunctionReference<
        "mutation",
        "internal",
        { data: any },
        any
      >;
      upsertFromClerk: FunctionReference<
        "mutation",
        "internal",
        { data: any },
        any
      >;
    };
  };
  queries: {
    billing: {
      catalog: {
        getBillingFeatures: FunctionReference<"query", "internal", {}, any>;
        getBillingPlans: FunctionReference<"query", "internal", {}, any>;
        getPlanFeatures: FunctionReference<
          "query",
          "internal",
          { planKey: string },
          any
        >;
        getPricingCatalog: FunctionReference<"query", "internal", {}, any>;
      };
      internal: {
        getBillingContextByStripeCustomerId: FunctionReference<
          "query",
          "internal",
          { stripeCustomerId: string },
          any
        >;
        getBillingSubscriptionByStripeSubscriptionIdForUser: FunctionReference<
          "query",
          "internal",
          { stripeSubscriptionId: string; userId: Id<"users"> },
          any
        >;
        getCurrentCreatorGrantByUserId: FunctionReference<
          "query",
          "internal",
          { userId: Id<"users"> },
          any
        >;
        getPlanByKey: FunctionReference<
          "query",
          "internal",
          { planKey: string },
          any
        >;
        getPlanByStripePriceId: FunctionReference<
          "query",
          "internal",
          { stripePriceId: string },
          any
        >;
        getUserBillingContextByClerkUserId: FunctionReference<
          "query",
          "internal",
          { clerkUserId: string },
          any
        >;
        listBillingSubscriptionsByUserId: FunctionReference<
          "query",
          "internal",
          { userId: Id<"users"> },
          any
        >;
      };
      resolution: {
        resolveUserEntitlements: FunctionReference<
          "query",
          "internal",
          { userId: Id<"users"> },
          any
        >;
        resolveUserPlanState: FunctionReference<
          "query",
          "internal",
          { userId: Id<"users"> },
          any
        >;
      };
    };
    creator: {
      internal: {
        getActiveAttributionByUserId: FunctionReference<
          "query",
          "internal",
          { userId: Id<"users"> },
          any
        >;
        getCreatorAccountById: FunctionReference<
          "query",
          "internal",
          { creatorAccountId: Id<"creatorAccounts"> },
          any
        >;
        getCreatorAccountByNormalizedCode: FunctionReference<
          "query",
          "internal",
          { normalizedCode: string },
          any
        >;
        getCreatorAccountByStripeConnectedAccountId: FunctionReference<
          "query",
          "internal",
          { stripeConnectedAccountId: string },
          any
        >;
        getCreatorAccountByUserId: FunctionReference<
          "query",
          "internal",
          { userId: Id<"users"> },
          any
        >;
        getCreatorProgramDefaults: FunctionReference<
          "query",
          "internal",
          {},
          any
        >;
        getUserByClerkUserId: FunctionReference<
          "query",
          "internal",
          { clerkUserId: string },
          any
        >;
      };
    };
    creatorTools: {
      playingWithViewers: {
        notifications: {
          getNotificationById: FunctionReference<
            "query",
            "internal",
            { notificationId: Id<"viewerQueueNotifications"> },
            any
          >;
          getRoundNotifications: FunctionReference<
            "query",
            "internal",
            { roundId: Id<"viewerQueueRounds"> },
            any
          >;
        };
        queue: {
          getLatestQueueRound: FunctionReference<
            "query",
            "internal",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          getQueueByCreatorUserId: FunctionReference<
            "query",
            "internal",
            { creatorUserId: Id<"users"> },
            any
          >;
          getQueueByGuildAndChannel: FunctionReference<
            "query",
            "internal",
            { channelId: string; guildId: string },
            any
          >;
          getQueueById: FunctionReference<
            "query",
            "internal",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          getQueueByTwitchBroadcasterId: FunctionReference<
            "query",
            "internal",
            { twitchBroadcasterId: string },
            any
          >;
          getQueueEntries: FunctionReference<
            "query",
            "internal",
            { queueId: Id<"viewerQueues"> },
            any
          >;
          getQueueEntryById: FunctionReference<
            "query",
            "internal",
            { entryId: Id<"viewerQueueEntries"> },
            any
          >;
          getQueueStatusForIdentity: FunctionReference<
            "query",
            "internal",
            {
              platform: "discord" | "twitch";
              platformUserId: string;
              queueId: Id<"viewerQueues">;
            },
            any
          >;
          getRoundById: FunctionReference<
            "query",
            "internal",
            { roundId: Id<"viewerQueueRounds"> },
            any
          >;
        };
        twitch: {
          getEnabledTwitchQueues: FunctionReference<
            "query",
            "internal",
            {},
            any
          >;
          getPendingTwitchNotifications: FunctionReference<
            "query",
            "internal",
            { limit?: number },
            any
          >;
        };
      };
    };
    featureFlags: {
      internal: {
        getByKey: FunctionReference<"query", "internal", { key: string }, any>;
      };
    };
    staff: {
      internal: {
        getBillingRecords: FunctionReference<"query", "internal", {}, any>;
        getBillingWebhookEventById: FunctionReference<
          "query",
          "internal",
          { eventId: Id<"billingWebhookEvents"> },
          any
        >;
        getBillingWebhookLedgerRecords: FunctionReference<
          "query",
          "internal",
          {},
          any
        >;
        getManagementRecords: FunctionReference<"query", "internal", {}, any>;
        getOverviewRecords: FunctionReference<"query", "internal", {}, any>;
        getRankedRecords: FunctionReference<"query", "internal", {}, any>;
        getUserByClerkUserId: FunctionReference<
          "query",
          "internal",
          { clerkUserId: string },
          any
        >;
        getUserById: FunctionReference<
          "query",
          "internal",
          { userId: Id<"users"> },
          any
        >;
        listUsers: FunctionReference<"query", "internal", {}, any>;
      };
    };
  };
};

export declare const components: {};
