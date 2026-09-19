import type { Id } from "../../convex/_generated/dataModel"

export type SessionHistoryMatch = {
  createdAt: number
  srChange: number
  outcome: "win" | "loss"
  lossProtected: boolean
}

// History arrives in ascending cursor order. Only loaded history is projected.
export function projectSessionHistory(
  session: { id: Id<"sessions">; startSr: number; startedAt: number },
  history: SessionHistoryMatch[],
  includeLossProtected: boolean
) {
  let currentSr = session.startSr
  const points = [
    {
      createdAt: session.startedAt,
      matchNumber: 0,
      sr: currentSr,
      srChange: 0,
    },
  ]
  const buckets = new Map<
    string,
    { dateKey: string; losses: number; netSr: number; wins: number }
  >()
  const outcomes: Pick<SessionHistoryMatch, "createdAt" | "outcome">[] = []
  for (const game of history) {
    if (!includeLossProtected && game.lossProtected) continue
    currentSr += game.srChange
    points.push({
      createdAt: game.createdAt,
      matchNumber: points.length,
      sr: currentSr,
      srChange: game.srChange,
    })
    outcomes.push({ createdAt: game.createdAt, outcome: game.outcome })
    const dateKey = new Date(game.createdAt).toISOString().slice(0, 10)
    const bucket = buckets.get(dateKey) ?? {
      dateKey,
      losses: 0,
      netSr: 0,
      wins: 0,
    }
    bucket.netSr += game.srChange
    if (game.outcome === "win") bucket.wins += 1
    else bucket.losses += 1
    buckets.set(dateKey, bucket)
  }
  return {
    srTimeline: { points, sessionId: session.id, startSr: session.startSr },
    dailyPerformance: {
      days: Array.from(buckets.values()).sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey)
      ),
      sessionId: session.id,
    },
    outcomes,
  }
}
