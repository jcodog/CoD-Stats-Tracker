import { describe, expect, it } from "bun:test";

import { selectCurrentBillingSubscription } from "../../queries/billing/internal.ts";
import { buildResolvedBillingState } from "../../queries/billing/resolution.ts";

const NOW = 1_700_000_000_000;
const USER_ID = "user_1";
const USER = {
  _creationTime: NOW - 100_000,
  _id: USER_ID,
  clerkUserId: "clerk_1",
  name: "Creator Test",
  plan: "free",
};

function makeSubscription(status, overrides = {}) {
  return {
    _creationTime: NOW - 20_000,
    _id: `sub_${status}`,
    attentionStatus: "none",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: NOW + 86_400_000,
    currentPeriodStart: NOW - 86_400_000,
    interval: "month",
    planKey: "premium",
    quantity: 1,
    status,
    stripeSubscriptionId: `stripe_${status}`,
    updatedAt: NOW - 10_000,
    userId: USER_ID,
    ...overrides,
  };
}

function makeCtx({ subscriptions }) {
  const tables = {
    billingAccessGrants: [],
    billingCustomers: [
      {
        _creationTime: NOW - 30_000,
        _id: "customer_1",
        stripeCustomerId: "cus_1",
        userId: USER_ID,
      },
    ],
    billingEntitlements: [],
    billingFeatures: [],
    billingPlanFeatures: [],
    billingPlans: [
      {
        _creationTime: NOW - 40_000,
        _id: "plan_1",
        active: true,
        archivedAt: undefined,
        description: "Premium plan",
        key: "premium",
        name: "Premium",
        planType: "paid",
        sortOrder: 1,
      },
    ],
    billingSubscriptions: subscriptions,
  };

  return {
    db: {
      query(tableName) {
        const rows = tables[tableName] ?? [];

        return {
          collect: async () => rows,
          withIndex: () => ({
            collect: async () => rows,
            unique: async () => rows[0] ?? null,
          }),
        };
      },
    },
  };
}

async function resolveCase(subscription) {
  const originalNow = Date.now;
  Date.now = () => NOW;

  try {
    return await buildResolvedBillingState(
      makeCtx({ subscriptions: [subscription] }),
      USER,
    );
  } finally {
    Date.now = originalNow;
  }
}

describe("billing subscription resolution", () => {
  it.each([
    ["active", "premium", "paid_subscription", true],
    ["trialing", "premium", "paid_subscription", true],
    ["past_due", "premium", "paid_subscription", true],
    ["paused", "free", "none", true],
    ["incomplete", "free", "none", true],
    ["incomplete_expired", "free", "none", false],
    ["unpaid", "free", "none", false],
  ])(
    "resolves %s subscriptions",
    async (status, appPlanKey, accessSource, shouldBeCurrent) => {
      const subscription = makeSubscription(status);
      const selected = selectCurrentBillingSubscription([subscription], NOW);
      const state = await resolveCase(subscription);

      expect(selected?.stripeSubscriptionId ?? null).toBe(
        shouldBeCurrent ? subscription.stripeSubscriptionId : null,
      );
      expect(state.subscription?.stripeSubscriptionId ?? null).toBe(
        shouldBeCurrent ? subscription.stripeSubscriptionId : null,
      );
      expect(state.appPlanKey).toBe(appPlanKey);
      expect(state.accessSource).toBe(accessSource);
    },
  );

  it("does not select canceled subscriptions even when a period remains", async () => {
    const subscription = makeSubscription("canceled", {
      canceledAt: NOW - 1_000,
      currentPeriodEnd: NOW + 86_400_000,
      endedAt: undefined,
    });
    const state = await resolveCase(subscription);

    expect(selectCurrentBillingSubscription([subscription], NOW)).toBeNull();
    expect(state.subscription).toBeNull();
    expect(state.appPlanKey).toBe("free");
    expect(state.accessSource).toBe("none");
  });

  it("does not select canceled subscriptions after the period ended", async () => {
    const subscription = makeSubscription("canceled", {
      canceledAt: NOW - 86_400_000,
      currentPeriodEnd: NOW - 1_000,
      endedAt: NOW - 1_000,
    });
    const state = await resolveCase(subscription);

    expect(selectCurrentBillingSubscription([subscription], NOW)).toBeNull();
    expect(state.subscription).toBeNull();
    expect(state.appPlanKey).toBe("free");
    expect(state.accessSource).toBe("none");
  });
});
