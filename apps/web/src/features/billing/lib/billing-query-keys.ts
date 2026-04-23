export const billingQueryKeys = {
  catalog: (preferredCurrency?: string) =>
    ["billing", "catalog", preferredCurrency ?? "default"] as const,
  catalogRoot: ["billing", "catalog"] as const,
  center: ["billing", "center"] as const,
  checkoutQuote: (args: {
    creatorCode?: string
    interval: "month" | "year"
    planKey: string
    preferredCurrency?: string
  }) =>
    [
      "billing",
      "checkoutQuote",
      args.planKey,
      args.interval,
      args.preferredCurrency ?? "default",
      args.creatorCode ?? "",
    ] as const,
  invoices: ["billing", "invoices"] as const,
  state: ["billing", "state"] as const,
}
