export type CreatorMetricRow =
  | { kind: "referral"; key: string; paid: boolean }
  | { kind: "earning"; currency: string; amount: number }

export function aggregateCreatorMetrics(rows: CreatorMetricRow[]) {
  const referrals = new Map<string, boolean>()
  const earnings = new Map<string, number>()
  for (const row of rows) {
    if (row.kind === "referral")
      referrals.set(row.key, Boolean(referrals.get(row.key)) || row.paid)
    else
      earnings.set(row.currency, (earnings.get(row.currency) ?? 0) + row.amount)
  }
  return {
    signupCount: referrals.size,
    paidConversionCount: Array.from(referrals.values()).filter(Boolean).length,
    estimatedEarningsByCurrency: Array.from(earnings, ([currency, amount]) => ({
      currency,
      amount,
    })).sort((a, b) => a.currency.localeCompare(b.currency)),
  }
}
