import { describe, expect, it } from "bun:test";

import {
  hasBillingSubscriptionPeriodRemaining,
  hasEffectivePaidSubscriptionAccess,
  hasManagedCreatorGrantSubscriptionAccess,
  hasPaidSubscriptionAccess,
  isManageableBillingSubscription,
  isManageableSubscriptionStatus,
  isTerminalSubscriptionStatus,
  maskIdentifier,
  normalizeBillingInterval,
  unixSecondsToMillis,
} from "../billing.ts";

describe("billing helpers", () => {
  it("normalizes billing intervals", () => {
    expect(normalizeBillingInterval("month")).toBe("month");
    expect(normalizeBillingInterval("year")).toBe("year");
    expect(normalizeBillingInterval("week")).toBeNull();
  });

  it("detects paid subscription access states", () => {
    expect(hasPaidSubscriptionAccess("active")).toBe(true);
    expect(hasPaidSubscriptionAccess("trialing")).toBe(true);
    expect(hasPaidSubscriptionAccess("past_due")).toBe(true);
    expect(hasPaidSubscriptionAccess("canceled")).toBe(false);
  });

  it("checks remaining billing period windows", () => {
    const now = 1_700_000_000_000;

    expect(
      hasBillingSubscriptionPeriodRemaining(
        {
          status: "active",
          currentPeriodEnd: now + 60_000,
        },
        now,
      ),
    ).toBe(true);

    expect(
      hasBillingSubscriptionPeriodRemaining(
        {
          status: "active",
          endedAt: now - 1,
        },
        now,
      ),
    ).toBe(false);

    expect(
      hasBillingSubscriptionPeriodRemaining(
        {
          status: "canceled",
          canceledAt: now - 1,
        },
        now,
      ),
    ).toBe(false);
  });

  it("derives effective and managed grant access", () => {
    const now = 1_700_000_000_000;

    const subscription = {
      status: "active",
      currentPeriodEnd: now + 60_000,
    };

    expect(hasEffectivePaidSubscriptionAccess(subscription, now)).toBe(true);
    expect(
      hasManagedCreatorGrantSubscriptionAccess(
        {
          ...subscription,
          managedGrantSource: "creator_approval",
        },
        now,
      ),
    ).toBe(true);
    expect(
      hasManagedCreatorGrantSubscriptionAccess(
        {
          ...subscription,
          managedGrantSource: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("evaluates manageable and terminal subscription states", () => {
    const now = 1_700_000_000_000;

    expect(isManageableSubscriptionStatus("active")).toBe(true);
    expect(isManageableSubscriptionStatus("canceled")).toBe(false);
    expect(
      isManageableBillingSubscription(
        {
          status: "past_due",
          currentPeriodEnd: now + 60_000,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isManageableBillingSubscription(
        {
          status: "incomplete_expired",
          currentPeriodEnd: now + 60_000,
        },
        now,
      ),
    ).toBe(false);

    expect(isTerminalSubscriptionStatus("canceled")).toBe(true);
    expect(isTerminalSubscriptionStatus("unpaid")).toBe(true);
    expect(isTerminalSubscriptionStatus("active")).toBe(false);
  });

  it("masks identifiers and converts unix seconds", () => {
    expect(maskIdentifier("sub_123456789", { keepEnd: 4 })).toBe("sub_…6789");
    expect(maskIdentifier("short", { keepEnd: 10 })).toBe("short");
    expect(maskIdentifier("sub_123", { full: true })).toBe("sub_123");
    expect(maskIdentifier(undefined)).toBeUndefined();

    expect(unixSecondsToMillis(1700)).toBe(1_700_000);
    expect(unixSecondsToMillis(null)).toBeUndefined();
  });
});

