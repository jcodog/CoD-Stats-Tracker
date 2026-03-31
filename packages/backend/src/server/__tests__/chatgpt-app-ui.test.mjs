import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { attachCodstatsUiToPayload } from "../chatgpt-app-ui.ts";
import { CHATGPT_APP_VIEWS } from "../chatgpt-app-contract.ts";
import { resetServerEnvForTests } from "../env.ts";

const TEST_ORIGIN = "https://stats-dev.cleoai.cloud";
const previousNodeEnv = process.env.NODE_ENV;
const previousAppPublicOrigin = process.env.APP_PUBLIC_ORIGIN;

function createPayload(view, data, generatedAt = 1_700_000_000_000) {
  return {
    ok: true,
    view,
    data,
    meta: {
      generatedAt,
    },
  };
}

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.APP_PUBLIC_ORIGIN = TEST_ORIGIN;
  resetServerEnvForTests();
});

afterAll(() => {
  if (previousNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = previousNodeEnv;
  }

  if (previousAppPublicOrigin === undefined) {
    delete process.env.APP_PUBLIC_ORIGIN;
  } else {
    process.env.APP_PUBLIC_ORIGIN = previousAppPublicOrigin;
  }

  resetServerEnvForTests();
});

describe("chatgpt app ui binding", () => {
  it("attaches a session view model for active current sessions", () => {
    const result = attachCodstatsUiToPayload(
      createPayload(CHATGPT_APP_VIEWS.sessionCurrent, {
        active: true,
        session: {
          title: "Warzone Ranked",
          season: 3.9,
          srCurrent: 3123,
          srChange: 55,
          wins: 7,
          losses: 2,
          kd: 1.42,
          kills: 71,
          deaths: 50,
          bestStreak: 4,
          startedAt: 111,
          recentMatches: [
            { srDelta: 10, playedAt: 100, mode: "ranked", outcome: "win" },
            { srChange: -5, createdAt: 200, mode: "ranked", outcome: "loss" },
            { delta: 15, timestamp: 150, mode: "ranked", outcome: "win" },
            { delta: 99, timestamp: 250, mode: "ranked", outcome: "ignored" },
          ],
        },
      }),
      TEST_ORIGIN,
    );

    expect(result.structuredContent.data.uiOutput).toEqual({
      templateUri: "ui://codstats/session.html",
      templateUrl: `${TEST_ORIGIN}/ui/codstats/session.html`,
      kind: "session",
    });
    expect(result.meta?.codstats.templateName).toBe("session");
    expect(result.meta?.codstats.kind).toBe("session");
    expect(result.meta?.codstats.viewModel).toEqual({
      source: "current",
      active: true,
      found: true,
      status: "Active",
      gameTitle: "Warzone Ranked",
      season: 3,
      srCurrent: 3123,
      srDelta: 55,
      wins: 7,
      losses: 2,
      kd: 1.42,
      kills: 71,
      deaths: 50,
      bestStreak: 4,
      startedAt: 111,
      lastUpdatedAt: 1_700_000_000_000,
      highlights: [
        { srDelta: 99, playedAt: 250, mode: "ranked", outcome: "ignored" },
        { srDelta: -5, playedAt: 200, mode: "ranked", outcome: "loss" },
        { srDelta: 15, playedAt: 150, mode: "ranked", outcome: "win" },
      ],
    });
  });

  it("uses fallback session deltas and inactive state for missing last sessions", () => {
    const result = attachCodstatsUiToPayload(
      createPayload(CHATGPT_APP_VIEWS.sessionLast, {
        found: false,
        session: {
          recentMatchDeltas: [12, -8, 5],
        },
      }),
      TEST_ORIGIN,
    );

    expect(result.meta?.codstats.viewModel.status).toBe("Inactive");
    expect(result.meta?.codstats.viewModel.highlights).toEqual([
      { srDelta: 12, playedAt: null, mode: null, outcome: null },
      { srDelta: -8, playedAt: null, mode: null, outcome: null },
      { srDelta: 5, playedAt: null, mode: null, outcome: null },
    ]);
  });

  it("attaches matches, rank, settings, and widget bindings with fallbacks", () => {
    const matches = attachCodstatsUiToPayload(
      createPayload(CHATGPT_APP_VIEWS.matchesHistory, {
        items: [
          {
            matchId: "m1",
            mode: "ranked",
            map: "Terminal",
            outcome: "win",
            srDelta: 55,
            kills: 30,
            deaths: 15,
            kd: 2,
            playedAt: 200,
          },
          null,
        ],
        nextCursor: "cursor_2",
        hasMore: true,
        limit: 20,
      }),
      TEST_ORIGIN,
    );

    expect(matches.meta?.codstats.templateName).toBe("matches");
    expect(matches.meta?.codstats.kind).toBe("matches");
    expect(matches.meta?.codstats.viewModel.items).toHaveLength(1);
    expect(matches.meta?.codstats.viewModel.hasMore).toBe(true);
    expect(matches.meta?.codstats.viewModel.nextCursorHint).toContain("Please use");

    const rank = attachCodstatsUiToPayload(
      createPayload(CHATGPT_APP_VIEWS.rankProgress, {
        title: "COD Ranked Skill Divisions",
        ruleset: "sr-v1",
        currentSr: 3200,
        current: {
          rank: "Gold",
          division: "III",
          minSr: 3100,
          maxSr: 3599,
        },
        nextDivision: {
          rank: "Platinum",
          division: "I",
          minSr: 3600,
          maxSr: 4199,
        },
        nextRank: {
          rank: "Diamond",
          minSr: 5400,
          maxSr: 6299,
        },
      }),
      TEST_ORIGIN,
    );

    expect(rank.meta?.codstats.templateName).toBe("rank");
    expect(rank.meta?.codstats.kind).toBe("rank");
    expect(rank.meta?.codstats.viewModel.current.displayName).toBe("Gold III");
    expect(rank.meta?.codstats.viewModel.nextDivision.srNeeded).toBe(400);
    expect(rank.meta?.codstats.viewModel.nextRank.displayName).toBe("Diamond");
    expect(rank.meta?.codstats.viewModel.progressToNextDivision).toBe(20);

    const settings = attachCodstatsUiToPayload(
      createPayload(CHATGPT_APP_VIEWS.settings, {
        connected: false,
        chatgptLinked: true,
        user: {
          discordId: "1234",
        },
      }),
      TEST_ORIGIN,
    );

    expect(settings.meta?.codstats.templateName).toBe("settings");
    expect(settings.meta?.codstats.kind).toBe("manage_connection");
    expect(settings.meta?.codstats.viewModel).toEqual({
      connected: false,
      chatgptLinked: true,
      connectionStatus: "Disconnected",
      name: "CodStats User",
      plan: "free",
      discordIdMasked: "****",
      lastSyncAt: null,
    });

    const widget = attachCodstatsUiToPayload(
      createPayload(CHATGPT_APP_VIEWS.uiOpen, {
        tab: "unsupported",
        dashboard: {
          session: {
            srCurrent: 3500,
            srChange: -25,
            matches: 9,
            wins: 5,
            losses: 4,
            kd: 1.1,
            kills: 44,
            deaths: 40,
            bestStreak: 3,
            startedAt: 99,
          },
          rank: {
            currentRank: "Platinum I",
            currentSr: 3500,
            nextTierTarget: "Platinum II",
            nextDivisionTarget: "Platinum II",
            nextRankTarget: "Diamond I",
            srNeeded: 100,
          },
          recentMatches: [
            { mode: "ranked", outcome: "loss", srDelta: -25, kd: 1.1, playedAt: 100 },
            { mode: "ranked", outcome: "win", srDelta: 40, kd: 1.7, playedAt: 110 },
            { mode: "ranked", outcome: "win", srDelta: 35, kd: 1.6, playedAt: 120 },
            { mode: "ranked", outcome: "win", srDelta: 20, kd: 1.2, playedAt: 130 },
            { mode: "ranked", outcome: "loss", srDelta: -15, kd: 0.9, playedAt: 140 },
            { mode: "ranked", outcome: "loss", srDelta: -10, kd: 0.8, playedAt: 150 },
          ],
          connection: {
            connected: true,
            status: "Connected",
            actionsHint: "Already linked.",
          },
        },
      }),
      TEST_ORIGIN,
    );

    expect(widget.meta?.codstats.templateName).toBe("widget");
    expect(widget.meta?.codstats.kind).toBe("dashboard");
    expect(widget.meta?.codstats.viewModel.tab).toBe("overview");
    expect(widget.meta?.codstats.viewModel.recentMatches).toHaveLength(5);
    expect(widget.meta?.codstats.viewModel.connection.actionsHint).toBe("Already linked.");
  });

  it("returns the payload unchanged for unsupported views", () => {
    const payload = createPayload(CHATGPT_APP_VIEWS.rankLadder, {
      divisions: [],
    });

    expect(attachCodstatsUiToPayload(payload, TEST_ORIGIN)).toEqual({
      structuredContent: payload,
    });
  });
});
