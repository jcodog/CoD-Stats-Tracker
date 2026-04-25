import { defineSchema } from "convex/server"
import { sessions } from "../src/db/tables/sessions"
import { games } from "../src/db/tables/games"
import { users } from "../src/db/tables/users"
import { chatgptAppConnections } from "../src/db/tables/chatgpt"
import {
  oauthAuthCodes,
  oauthClients,
  oauthTokens,
} from "../src/db/tables/oauth"
import {
  landingGlobalStats,
  landingUserStats,
} from "../src/db/tables/landingStats"
import { featureFlags } from "../src/db/tables/featureFlags"
import { billingCustomers } from "../src/db/tables/billing/customers"
import { billingPlans } from "../src/db/tables/billing/plans"
import { billingFeatures } from "../src/db/tables/billing/features"
import { billingPlanFeatures } from "../src/db/tables/billing/planFeatures"
import { billingSubscriptions } from "../src/db/tables/billing/subscriptions"
import { billingPaymentMethods } from "../src/db/tables/billing/paymentMethods"
import { billingInvoices } from "../src/db/tables/billing/invoices"
import { billingEntitlements } from "../src/db/tables/billing/entitlements"
import { billingAccessGrants } from "../src/db/tables/billing/accessGrants"
import { billingWebhookEvents } from "../src/db/tables/billing/webhookEvents"
import { staffAuditLogs } from "../src/db/tables/staffAuditLogs"
import { viewerQueues } from "../src/db/tables/creatorTools/playingWithViewers/queues"
import { viewerQueueEntries } from "../src/db/tables/creatorTools/playingWithViewers/entries"
import { viewerQueueRounds } from "../src/db/tables/creatorTools/playingWithViewers/rounds"
import { viewerQueueMessageSyncs } from "../src/db/tables/creatorTools/playingWithViewers/messageSync"
import { viewerQueueCooldowns } from "../src/db/tables/creatorTools/playingWithViewers/cooldowns"
import { viewerQueueNotifications } from "../src/db/tables/creatorTools/playingWithViewers/notifications"
import { activisionUsernames } from "../src/db/tables/activisionUsernames"
import { rankedConfigs } from "../src/db/tables/rankedConfigs"
import { rankedMaps } from "../src/db/tables/rankedMaps"
import { rankedModes } from "../src/db/tables/rankedModes"
import { rankedTitles } from "../src/db/tables/rankedTitles"
import { connectedAccounts } from "../src/db/tables/connectedAccounts"
import { creatorAccounts } from "../src/db/tables/creatorAccounts"
import { creatorAttributions } from "../src/db/tables/creatorAttributions"
import { creatorProgramDefaults } from "../src/db/tables/creatorProgramDefaults"

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
