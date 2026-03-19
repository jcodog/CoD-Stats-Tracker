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
        createSubscriptionIntent: FunctionReference<
          "action",
          "public",
          { attemptKey?: string; interval: "month" | "year"; planKey: string },
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
              inviteMode: "discord_dm" | "manual_creator_contact";
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
          inviteQueueEntryNowAndNotify: FunctionReference<
            "action",
            "public",
            { entryId: Id<"viewerQueueEntries">; lobbyCode?: string },
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
          selectNextBatchAndNotify: FunctionReference<
            "action",
            "public",
            { lobbyCode?: string; queueId: Id<"viewerQueues"> },
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
          removeQueueEntry: FunctionReference<
            "action",
            "public",
            { entryId: Id<"viewerQueueEntries"> },
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
              inviteMode: "discord_dm" | "manual_creator_contact";
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
          {},
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
    creatorTools: {
      playingWithViewers: {
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
              inviteMode: "discord_dm" | "manual_creator_contact";
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
                | "top250";
              username: string;
            },
            any
          >;
          inviteQueueEntryNow: FunctionReference<
            "mutation",
            "internal",
            { entryId: Id<"viewerQueueEntries">; lobbyCode?: string },
            any
          >;
          leaveQueue: FunctionReference<
            "mutation",
            "internal",
            { discordUserId: string; queueId: Id<"viewerQueues"> },
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
            { lobbyCode?: string; queueId: Id<"viewerQueues"> },
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
                discordUserId: string;
                displayName: string;
                dmFailureReason?: string;
                dmStatus?: "sent" | "failed";
                rank:
                  | "bronze"
                  | "silver"
                  | "gold"
                  | "platinum"
                  | "diamond"
                  | "crimson"
                  | "iridescent"
                  | "top250";
                username: string;
              }>;
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
              inviteMode: "discord_dm" | "manual_creator_contact";
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
    creatorTools: {
      playingWithViewers: {
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
      };
    };
  };
};

export declare const components: {};
