import { defineSchema } from "convex/server"
import { sessions } from "./db/tables/sessions"
import { games } from "./db/tables/games"
import { users } from "./db/tables/users"
import { chatgptAppConnections } from "./db/tables/chatgpt"
import { oauthAuthCodes, oauthClients, oauthTokens } from "./db/tables/oauth"
import { landingGlobalStats, landingUserStats } from "./db/tables/landingStats"
import { featureFlags } from "./db/tables/featureFlags"
import { billingCustomers } from "./db/tables/billing/customers"
import { billingPlans } from "./db/tables/billing/plans"
import { billingFeatures } from "./db/tables/billing/features"
import { billingPlanFeatures } from "./db/tables/billing/planFeatures"
import { billingSubscriptions } from "./db/tables/billing/subscriptions"
import { billingPaymentMethods } from "./db/tables/billing/paymentMethods"
import { billingInvoices } from "./db/tables/billing/invoices"
import { billingEntitlements } from "./db/tables/billing/entitlements"
import { billingAccessGrants } from "./db/tables/billing/accessGrants"
import { billingWebhookEvents } from "./db/tables/billing/webhookEvents"
import { staffAuditLogs } from "./db/tables/staffAuditLogs"
import { viewerQueues } from "./db/tables/creatorTools/playingWithViewers/queues"
import { viewerQueueEntries } from "./db/tables/creatorTools/playingWithViewers/entries"
import { viewerQueueRounds } from "./db/tables/creatorTools/playingWithViewers/rounds"
import { viewerQueueMessageSyncs } from "./db/tables/creatorTools/playingWithViewers/messageSync"
import { viewerQueueCooldowns } from "./db/tables/creatorTools/playingWithViewers/cooldowns"
import { viewerQueueNotifications } from "./db/tables/creatorTools/playingWithViewers/notifications"
import { activisionUsernames } from "./db/tables/activisionUsernames"
import { rankedConfigs } from "./db/tables/rankedConfigs"
import { rankedMaps } from "./db/tables/rankedMaps"
import { rankedModes } from "./db/tables/rankedModes"
import { rankedTitles } from "./db/tables/rankedTitles"
import { connectedAccounts } from "./db/tables/connectedAccounts"
import { creatorAccounts } from "./db/tables/creatorAccounts"
import { creatorAttributions } from "./db/tables/creatorAttributions"
import { creatorProgramDefaults } from "./db/tables/creatorProgramDefaults"

export default defineSchema({
  sessions,
  games,
  users,
  activisionUsernames,
  rankedTitles,
  rankedModes,
  rankedMaps,
  rankedConfigs,
  chatgptAppConnections,
  oauthAuthCodes,
  oauthClients,
  oauthTokens,
  landingGlobalStats,
  landingUserStats,
  featureFlags,
  billingCustomers,
  billingPlans,
  billingFeatures,
  billingPlanFeatures,
  billingSubscriptions,
  billingPaymentMethods,
  billingInvoices,
  billingEntitlements,
  billingAccessGrants,
  billingWebhookEvents,
  staffAuditLogs,
  viewerQueues,
  viewerQueueEntries,
  viewerQueueRounds,
  viewerQueueMessageSyncs,
  viewerQueueCooldowns,
  viewerQueueNotifications,
  connectedAccounts,
  creatorAccounts,
  creatorAttributions,
  creatorProgramDefaults,
})
