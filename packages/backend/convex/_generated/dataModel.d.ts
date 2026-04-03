/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  DocumentByName,
  TableNamesInDataModel,
  SystemTableNames,
  AnyDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";

/**
 * A type describing your Convex data model.
 *
 * This type includes information about what tables you have, the type of
 * documents stored in those tables, and the indexes defined on them.
 *
 * This type is used to parameterize methods like `queryGeneric` and
 * `mutationGeneric` to make them type-safe.
 */

export type DataModel = {
  activisionUsernames: {
    document: {
      createdAt: number;
      displayUsername: string;
      isPrimary?: boolean;
      lastUsedAt: number;
      normalizedUsername: string;
      ownerUserId: Id<"users">;
      updatedAt: number;
      _id: Id<"activisionUsernames">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "displayUsername"
      | "isPrimary"
      | "lastUsedAt"
      | "normalizedUsername"
      | "ownerUserId"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_owner: ["ownerUserId", "_creationTime"];
      by_owner_normalized: [
        "ownerUserId",
        "normalizedUsername",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingAccessGrants: {
    document: {
      active: boolean;
      clerkUserId: string;
      createdAt: number;
      endsAt?: number;
      grantedByClerkUserId?: string;
      grantedByName?: string;
      planKey: string;
      reason: string;
      revokedAt?: number;
      revokedByClerkUserId?: string;
      revokedByName?: string;
      source: "creator_approval" | "manual" | "promo";
      startsAt?: number;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"billingAccessGrants">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "active"
      | "clerkUserId"
      | "createdAt"
      | "endsAt"
      | "grantedByClerkUserId"
      | "grantedByName"
      | "planKey"
      | "reason"
      | "revokedAt"
      | "revokedByClerkUserId"
      | "revokedByName"
      | "source"
      | "startsAt"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_clerkUserId: ["clerkUserId", "_creationTime"];
      by_planKey_active: ["planKey", "active", "_creationTime"];
      by_userId: ["userId", "_creationTime"];
      by_userId_active: ["userId", "active", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingCustomers: {
    document: {
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
      createdAt: number;
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
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"billingCustomers">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "active"
      | "billingAddress"
      | "billingAddress.city"
      | "billingAddress.country"
      | "billingAddress.line1"
      | "billingAddress.line2"
      | "billingAddress.postalCode"
      | "billingAddress.state"
      | "businessName"
      | "clerkUserId"
      | "createdAt"
      | "defaultPaymentMethodId"
      | "email"
      | "lastSyncedAt"
      | "name"
      | "phone"
      | "stripeCustomerId"
      | "taxExempt"
      | "taxIds"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_active: ["active", "_creationTime"];
      by_clerkUserId: ["clerkUserId", "_creationTime"];
      by_stripeCustomerId: ["stripeCustomerId", "_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingEntitlements: {
    document: {
      clerkUserId: string;
      createdAt: number;
      enabled: boolean;
      endsAt?: number;
      featureKey: string;
      notes?: string;
      source: "plan" | "manual" | "promo" | "creator_approval";
      startsAt?: number;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"billingEntitlements">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "clerkUserId"
      | "createdAt"
      | "enabled"
      | "endsAt"
      | "featureKey"
      | "notes"
      | "source"
      | "startsAt"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_clerkUserId: ["clerkUserId", "_creationTime"];
      by_featureKey: ["featureKey", "_creationTime"];
      by_userId: ["userId", "_creationTime"];
      by_userId_featureKey: ["userId", "featureKey", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingFeatures: {
    document: {
      active: boolean;
      appliesTo?: "entitlement" | "marketing" | "both";
      archivedAt?: number;
      category?: string;
      createdAt: number;
      description: string;
      key: string;
      name: string;
      sortOrder: number;
      stripeFeatureId?: string;
      updatedAt: number;
      _id: Id<"billingFeatures">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "active"
      | "appliesTo"
      | "archivedAt"
      | "category"
      | "createdAt"
      | "description"
      | "key"
      | "name"
      | "sortOrder"
      | "stripeFeatureId"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_active: ["active", "_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingInvoices: {
    document: {
      amountDue: number;
      amountPaid: number;
      amountTotal?: number;
      clerkUserId: string;
      createdAt: number;
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
      stripeCustomerId: string;
      stripeInvoiceId: string;
      stripeSubscriptionId?: string;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"billingInvoices">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "amountDue"
      | "amountPaid"
      | "amountTotal"
      | "clerkUserId"
      | "createdAt"
      | "currency"
      | "description"
      | "hostedInvoiceUrl"
      | "invoiceIssuedAt"
      | "invoiceNumber"
      | "invoicePdfUrl"
      | "paymentMethodBrand"
      | "paymentMethodLast4"
      | "paymentMethodType"
      | "status"
      | "stripeCustomerId"
      | "stripeInvoiceId"
      | "stripeSubscriptionId"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_stripeCustomerId: ["stripeCustomerId", "_creationTime"];
      by_stripeInvoiceId: ["stripeInvoiceId", "_creationTime"];
      by_userId: ["userId", "_creationTime"];
      by_userId_and_invoiceIssuedAt: [
        "userId",
        "invoiceIssuedAt",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingPaymentMethods: {
    document: {
      active: boolean;
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
      clerkUserId: string;
      createdAt: number;
      expMonth?: number;
      expYear?: number;
      isDefault: boolean;
      last4?: string;
      stripeCustomerId: string;
      stripePaymentMethodId: string;
      type: string;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"billingPaymentMethods">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "active"
      | "bankName"
      | "billingAddress"
      | "billingAddress.city"
      | "billingAddress.country"
      | "billingAddress.line1"
      | "billingAddress.line2"
      | "billingAddress.postalCode"
      | "billingAddress.state"
      | "brand"
      | "cardholderName"
      | "clerkUserId"
      | "createdAt"
      | "expMonth"
      | "expYear"
      | "isDefault"
      | "last4"
      | "stripeCustomerId"
      | "stripePaymentMethodId"
      | "type"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_stripeCustomerId: ["stripeCustomerId", "_creationTime"];
      by_stripePaymentMethodId: ["stripePaymentMethodId", "_creationTime"];
      by_userId: ["userId", "_creationTime"];
      by_userId_and_active: ["userId", "active", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingPlanFeatures: {
    document: {
      createdAt: number;
      enabled: boolean;
      featureKey: string;
      planKey: string;
      updatedAt: number;
      _id: Id<"billingPlanFeatures">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "enabled"
      | "featureKey"
      | "planKey"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_featureKey: ["featureKey", "_creationTime"];
      by_planKey: ["planKey", "_creationTime"];
      by_planKey_featureKey: ["planKey", "featureKey", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingPlans: {
    document: {
      active: boolean;
      archivedAt?: number;
      createdAt: number;
      currency: string;
      description: string;
      key: string;
      monthlyPriceAmount: number;
      monthlyPriceId?: string;
      name: string;
      planType: "free" | "paid";
      sortOrder: number;
      stripeProductId?: string;
      updatedAt: number;
      yearlyPriceAmount: number;
      yearlyPriceId?: string;
      _id: Id<"billingPlans">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "active"
      | "archivedAt"
      | "createdAt"
      | "currency"
      | "description"
      | "key"
      | "monthlyPriceAmount"
      | "monthlyPriceId"
      | "name"
      | "planType"
      | "sortOrder"
      | "stripeProductId"
      | "updatedAt"
      | "yearlyPriceAmount"
      | "yearlyPriceId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_active: ["active", "_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingSubscriptions: {
    document: {
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
      clerkUserId: string;
      createdAt: number;
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
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"billingSubscriptions">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "attentionStatus"
      | "attentionUpdatedAt"
      | "cancelAt"
      | "cancelAtPeriodEnd"
      | "canceledAt"
      | "clerkUserId"
      | "createdAt"
      | "currentPeriodEnd"
      | "currentPeriodStart"
      | "defaultPaymentMethodId"
      | "endedAt"
      | "interval"
      | "lastStripeEventId"
      | "managedGrantEndsAt"
      | "managedGrantMode"
      | "managedGrantSource"
      | "planKey"
      | "quantity"
      | "scheduledChangeAt"
      | "scheduledChangeRequestedAt"
      | "scheduledChangeType"
      | "scheduledInterval"
      | "scheduledPlanKey"
      | "startedAt"
      | "status"
      | "stripeCustomerId"
      | "stripeLatestInvoiceId"
      | "stripeLatestPaymentIntentId"
      | "stripePriceId"
      | "stripeProductId"
      | "stripeScheduleId"
      | "stripeSubscriptionId"
      | "stripeSubscriptionItemId"
      | "trialEnd"
      | "trialStart"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_attentionStatus: ["attentionStatus", "_creationTime"];
      by_clerkUserId: ["clerkUserId", "_creationTime"];
      by_planKey: ["planKey", "_creationTime"];
      by_status: ["status", "_creationTime"];
      by_stripeCustomerId: ["stripeCustomerId", "_creationTime"];
      by_stripeSubscriptionId: ["stripeSubscriptionId", "_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  billingWebhookEvents: {
    document: {
      createdAt: number;
      customerId?: string;
      deliveryCount?: number;
      errorMessage?: string;
      eventType: string;
      invoiceId?: string;
      lastDeliveryAt?: number;
      payloadBackfilledAt?: number;
      payloadJson?: string;
      payloadUnavailableAt?: number;
      payloadUnavailableReason?: string;
      paymentIntentId?: string;
      processedAt?: number;
      processingAttemptCount?: number;
      processingClaimedAt?: number;
      processingStatus:
        | "received"
        | "processing"
        | "processed"
        | "ignored"
        | "failed";
      receivedAt: number;
      safeSummary: string;
      stripeEventId: string;
      subscriptionId?: string;
      updatedAt: number;
      _id: Id<"billingWebhookEvents">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "customerId"
      | "deliveryCount"
      | "errorMessage"
      | "eventType"
      | "invoiceId"
      | "lastDeliveryAt"
      | "payloadBackfilledAt"
      | "payloadJson"
      | "payloadUnavailableAt"
      | "payloadUnavailableReason"
      | "paymentIntentId"
      | "processedAt"
      | "processingAttemptCount"
      | "processingClaimedAt"
      | "processingStatus"
      | "receivedAt"
      | "safeSummary"
      | "stripeEventId"
      | "subscriptionId"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_eventType_receivedAt: ["eventType", "receivedAt", "_creationTime"];
      by_processingStatus_receivedAt: [
        "processingStatus",
        "receivedAt",
        "_creationTime",
      ];
      by_receivedAt: ["receivedAt", "_creationTime"];
      by_stripeEventId: ["stripeEventId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  chatgptAppConnections: {
    document: {
      createdAt: number;
      lastUsedAt?: number;
      linkedAt: number;
      revokedAt?: number;
      scopes: Array<string>;
      status: "active" | "revoked";
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"chatgptAppConnections">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "lastUsedAt"
      | "linkedAt"
      | "revokedAt"
      | "scopes"
      | "status"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  featureFlags: {
    document: {
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
      _id: Id<"featureFlags">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "adminBypass"
      | "allowlistUserIds"
      | "creatorBypass"
      | "enabled"
      | "key"
      | "premiumBypass"
      | "rolloutPercent"
      | "staffBypass"
      | "syncedAt"
      | "syncedFrom";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  games: {
    document: {
      createdAt: number;
      deaths?: null | number;
      defuses?: null | number;
      enemyScore?: null | number;
      hillTimeSeconds?: null | number;
      kills?: null | number;
      lossProtected: boolean;
      mapId?: Id<"rankedMaps">;
      mapNameSnapshot?: string;
      mode?: string;
      modeId?: Id<"rankedModes">;
      notes?: string;
      outcome: "win" | "loss";
      overloads?: null | number;
      ownerUserId?: Id<"users">;
      plants?: null | number;
      sessionId: string;
      srChange: number;
      teamScore?: null | number;
      userId: string;
      _id: Id<"games">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "deaths"
      | "defuses"
      | "enemyScore"
      | "hillTimeSeconds"
      | "kills"
      | "lossProtected"
      | "mapId"
      | "mapNameSnapshot"
      | "mode"
      | "modeId"
      | "notes"
      | "outcome"
      | "overloads"
      | "ownerUserId"
      | "plants"
      | "sessionId"
      | "srChange"
      | "teamScore"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_createdat: ["createdAt", "_creationTime"];
      by_session: ["sessionId", "_creationTime"];
      by_session_createdat: ["sessionId", "createdAt", "_creationTime"];
      by_user_createdat: ["userId", "createdAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  landingGlobalStats: {
    document: {
      activeSessions: number;
      key: "global";
      losses: number;
      matchesIndexed: number;
      sessionsTracked: number;
      updatedAt: number;
      wins: number;
      _id: Id<"landingGlobalStats">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "activeSessions"
      | "key"
      | "losses"
      | "matchesIndexed"
      | "sessionsTracked"
      | "updatedAt"
      | "wins";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  landingUserStats: {
    document: {
      activeSessions: number;
      losses: number;
      matchesIndexed: number;
      sessionsTracked: number;
      updatedAt: number;
      userId: string;
      wins: number;
      _id: Id<"landingUserStats">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "activeSessions"
      | "losses"
      | "matchesIndexed"
      | "sessionsTracked"
      | "updatedAt"
      | "userId"
      | "wins";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  oauthAuthCodes: {
    document: {
      clientId: string;
      codeChallenge?: string;
      codeChallengeMethod?: "S256";
      codeHash: string;
      createdAt: number;
      expiresAt: number;
      redirectUri: string;
      resource: string;
      scopes: Array<string>;
      sessionId: string;
      stateHash: string;
      userId: Id<"users">;
      _id: Id<"oauthAuthCodes">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "clientId"
      | "codeChallenge"
      | "codeChallengeMethod"
      | "codeHash"
      | "createdAt"
      | "expiresAt"
      | "redirectUri"
      | "resource"
      | "scopes"
      | "sessionId"
      | "stateHash"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_codeHash: ["codeHash", "_creationTime"];
      by_expiresAt: ["expiresAt", "_creationTime"];
      by_session_state: ["sessionId", "stateHash", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  oauthClients: {
    document: {
      clientId: string;
      clientName?: string;
      clientSecretHash?: string;
      clientUri?: string;
      createdAt: number;
      grantTypes: Array<string>;
      redirectUris: Array<string>;
      responseTypes: Array<string>;
      revokedAt?: number;
      scope?: string;
      tokenEndpointAuthMethod:
        | "none"
        | "client_secret_post"
        | "client_secret_basic";
      updatedAt: number;
      _id: Id<"oauthClients">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "clientId"
      | "clientName"
      | "clientSecretHash"
      | "clientUri"
      | "createdAt"
      | "grantTypes"
      | "redirectUris"
      | "responseTypes"
      | "revokedAt"
      | "scope"
      | "tokenEndpointAuthMethod"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_clientId: ["clientId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  oauthTokens: {
    document: {
      clientId: string;
      createdAt: number;
      lastUsedAt?: number;
      provider: "chatgpt_app";
      refreshTokenExpiresAt: number;
      refreshTokenHash: string;
      resource: string;
      revokedAt?: number;
      scopes: Array<string>;
      userId: Id<"users">;
      _id: Id<"oauthTokens">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "clientId"
      | "createdAt"
      | "lastUsedAt"
      | "provider"
      | "refreshTokenExpiresAt"
      | "refreshTokenHash"
      | "resource"
      | "revokedAt"
      | "scopes"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_expiresAt: ["refreshTokenExpiresAt", "_creationTime"];
      by_refreshTokenHash: ["refreshTokenHash", "_creationTime"];
      by_user_provider: ["userId", "provider", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  rankedConfigs: {
    document: {
      activeSeason: number;
      activeTitleKey: string;
      key: "current";
      sessionWritesEnabled?: boolean;
      updatedAt: number;
      updatedByUserId: Id<"users">;
      _id: Id<"rankedConfigs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "activeSeason"
      | "activeTitleKey"
      | "key"
      | "sessionWritesEnabled"
      | "updatedAt"
      | "updatedByUserId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  rankedMaps: {
    document: {
      createdAt: number;
      isActive: boolean;
      name: string;
      normalizedName: string;
      sortOrder: number;
      supportedModeIds?: Array<Id<"rankedModes">>;
      titleKey: string;
      updatedAt: number;
      _id: Id<"rankedMaps">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "isActive"
      | "name"
      | "normalizedName"
      | "sortOrder"
      | "supportedModeIds"
      | "titleKey"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_title: ["titleKey", "_creationTime"];
      by_title_active_sort: [
        "titleKey",
        "isActive",
        "sortOrder",
        "_creationTime",
      ];
      by_title_normalized: ["titleKey", "normalizedName", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  rankedModes: {
    document: {
      createdAt: number;
      isActive: boolean;
      key: string;
      label: string;
      sortOrder: number;
      titleKey: string;
      updatedAt: number;
      _id: Id<"rankedModes">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "isActive"
      | "key"
      | "label"
      | "sortOrder"
      | "titleKey"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_title: ["titleKey", "_creationTime"];
      by_title_active_sort: [
        "titleKey",
        "isActive",
        "sortOrder",
        "_creationTime",
      ];
      by_title_key: ["titleKey", "key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  rankedTitles: {
    document: {
      createdAt: number;
      isActive: boolean;
      key: string;
      label: string;
      sortOrder: number;
      updatedAt: number;
      _id: Id<"rankedTitles">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "isActive"
      | "key"
      | "label"
      | "sortOrder"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_active_sort: ["isActive", "sortOrder", "_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  sessions: {
    document: {
      activisionUsernameId?: Id<"activisionUsernames">;
      activisionUsernameSnapshot?: string;
      archivedReason?:
        | "title_rollover"
        | "season_rollover"
        | "title_and_season_rollover";
      bestStreak: number;
      codTitle: string;
      currentSr: number;
      deaths: number;
      endedAt: null | number;
      kills: number;
      lastMatchLoggedAt?: number;
      losses: number;
      matchCount?: number;
      ownerUserId?: Id<"users">;
      season: number;
      startSr: number;
      startedAt: number;
      streak: number;
      titleKey?: string;
      titleLabelSnapshot?: string;
      titleSeasonKey?: string;
      userId: string;
      uuid: string;
      wins: number;
      _id: Id<"sessions">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "activisionUsernameId"
      | "activisionUsernameSnapshot"
      | "archivedReason"
      | "bestStreak"
      | "codTitle"
      | "currentSr"
      | "deaths"
      | "endedAt"
      | "kills"
      | "lastMatchLoggedAt"
      | "losses"
      | "matchCount"
      | "ownerUserId"
      | "season"
      | "startedAt"
      | "startSr"
      | "streak"
      | "titleKey"
      | "titleLabelSnapshot"
      | "titleSeasonKey"
      | "userId"
      | "uuid"
      | "wins";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_endedAt: ["endedAt", "_creationTime"];
      by_owner_startedAt: ["ownerUserId", "startedAt", "_creationTime"];
      by_owner_titleSeason: ["ownerUserId", "titleSeasonKey", "_creationTime"];
      by_owner_titleSeason_username: [
        "ownerUserId",
        "titleSeasonKey",
        "activisionUsernameSnapshot",
        "_creationTime",
      ];
      by_user: ["userId", "_creationTime"];
      by_user_cod_season: ["userId", "codTitle", "season", "_creationTime"];
      by_uuid: ["uuid", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  staffAuditLogs: {
    document: {
      action: string;
      actorClerkUserId: string;
      actorName: string;
      actorRole: "user" | "staff" | "admin" | "super_admin";
      createdAt: number;
      details?: string;
      entityId: string;
      entityLabel?: string;
      entityType: string;
      result: "success" | "warning" | "error";
      summary: string;
      _id: Id<"staffAuditLogs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "action"
      | "actorClerkUserId"
      | "actorName"
      | "actorRole"
      | "createdAt"
      | "details"
      | "entityId"
      | "entityLabel"
      | "entityType"
      | "result"
      | "summary";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_actorClerkUserId: ["actorClerkUserId", "_creationTime"];
      by_createdAt: ["createdAt", "_creationTime"];
      by_entityType: ["entityType", "_creationTime"];
      by_entityType_createdAt: ["entityType", "createdAt", "_creationTime"];
      by_entityType_entityId: ["entityType", "entityId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  users: {
    document: {
      chatgptLinked: boolean;
      chatgptLinkedAt?: number;
      chatgptRevokedAt?: number;
      cleoDashLinked: boolean;
      clerkUserId: string;
      createdAt: number;
      discordId: string;
      name: string;
      plan: "free" | "premium" | "creator";
      preferredMatchLoggingMode?: "basic" | "comprehensive";
      role?: "user" | "admin" | "staff" | "super_admin";
      status: "active" | "disabled";
      updatedAt: number;
      _id: Id<"users">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "chatgptLinked"
      | "chatgptLinkedAt"
      | "chatgptRevokedAt"
      | "cleoDashLinked"
      | "clerkUserId"
      | "createdAt"
      | "discordId"
      | "name"
      | "plan"
      | "preferredMatchLoggingMode"
      | "role"
      | "status"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_clerkUserId: ["clerkUserId", "_creationTime"];
      by_discordId: ["discordId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  viewerQueueEntries: {
    document: {
      avatarUrl?: string;
      discordUserId: string;
      displayName: string;
      joinedAt: number;
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
      _id: Id<"viewerQueueEntries">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "avatarUrl"
      | "discordUserId"
      | "displayName"
      | "joinedAt"
      | "queueId"
      | "rank"
      | "username";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_queueId: ["queueId", "_creationTime"];
      by_queueId_and_discordUserId: [
        "queueId",
        "discordUserId",
        "_creationTime",
      ];
      by_queueId_and_joinedAt: ["queueId", "joinedAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  viewerQueueMessageSyncs: {
    document: {
      createdAt: number;
      errorMessage?: string;
      operation: "publish" | "update" | "disable";
      queueId: Id<"viewerQueues">;
      status: "success" | "failed";
      _id: Id<"viewerQueueMessageSyncs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "errorMessage"
      | "operation"
      | "queueId"
      | "status";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  viewerQueueRounds: {
    document: {
      createdAt: number;
      lobbyCode?: string;
      mode: "discord_dm" | "manual_creator_contact";
      queueId: Id<"viewerQueues">;
      selectedCount: number;
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
      _id: Id<"viewerQueueRounds">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "lobbyCode"
      | "mode"
      | "queueId"
      | "selectedCount"
      | "selectedUsers";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_queueId: ["queueId", "_creationTime"];
      by_queueId_and_createdAt: ["queueId", "createdAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  viewerQueues: {
    document: {
      channelId: string;
      channelName?: string;
      channelPermsCorrect?: boolean;
      createdAt: number;
      creatorDisplayName: string;
      creatorMessage?: string;
      creatorUserId: Id<"users">;
      gameLabel: string;
      guildId: string;
      guildName?: string;
      inviteMode: "discord_dm" | "manual_creator_contact";
      isActive: boolean;
      lastMessageSyncError?: string;
      lastSelectedRoundId?: Id<"viewerQueueRounds">;
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
      messageId?: string;
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
      updatedAt: number;
      _id: Id<"viewerQueues">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "channelId"
      | "channelName"
      | "channelPermsCorrect"
      | "createdAt"
      | "creatorDisplayName"
      | "creatorMessage"
      | "creatorUserId"
      | "gameLabel"
      | "guildId"
      | "guildName"
      | "inviteMode"
      | "isActive"
      | "lastMessageSyncError"
      | "lastSelectedRoundId"
      | "matchesPerViewer"
      | "maxRank"
      | "messageId"
      | "minRank"
      | "playersPerBatch"
      | "rulesText"
      | "title"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_creatorUserId: ["creatorUserId", "_creationTime"];
      by_creatorUserId_and_guildId: [
        "creatorUserId",
        "guildId",
        "_creationTime",
      ];
      by_guildId_and_channelId: ["guildId", "channelId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
};

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Doc<TableName extends TableNames> = DocumentByName<
  DataModel,
  TableName
>;

/**
 * An identifier for a document in Convex.
 *
 * Convex documents are uniquely identified by their `Id`, which is accessible
 * on the `_id` field. To learn more, see [Document IDs](https://docs.convex.dev/using/document-ids).
 *
 * Documents can be loaded using `db.get(tableName, id)` in query and mutation functions.
 *
 * IDs are just strings at runtime, but this type can be used to distinguish them from other
 * strings when type checking.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Id<TableName extends TableNames | SystemTableNames> =
  GenericId<TableName>;
