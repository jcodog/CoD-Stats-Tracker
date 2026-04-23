export type PolicySlug =
  | "tos"
  | "privacy"
  | "cookies"
  | "refunds"
  | "gdpr"
  | "disputes"

export type PolicySection = {
  bullets?: string[]
  paragraphs?: string[]
  title: string
}

export type PolicyDocument = {
  description: string
  lastUpdated: string
  slug: PolicySlug
  summary: string
  title: string
  sections: PolicySection[]
}

export const POLICY_LAST_UPDATED = "April 4, 2026"

export const POLICY_STRIPE_FEE_NOTE =
  "Refunds are reduced by the Stripe processing fee charged on the original payment. On Stripe's current UK pricing, that is typically 1.5% + £0.20 for standard UK cards or 1.9% + £0.20 for premium UK cards. If Stripe applies a different fee to the original transaction, the actual fee charged by Stripe is the amount deducted from the refund."

export const POLICY_DOCUMENTS = [
  {
    slug: "tos",
    title: "Terms of Service",
    description:
      "The rules that apply when you use CodStats, including account access, subscriptions, acceptable use, and service availability.",
    summary:
      "CodStats is a paid web service for ranked-play tracking and creator tooling. Using it means you agree to the service rules, subscription terms, and acceptable use standards below.",
    lastUpdated: POLICY_LAST_UPDATED,
    sections: [
      {
        title: "Acceptance and eligibility",
        paragraphs: [
          "By accessing CodStats, creating an account, or using any paid feature, you agree to these Terms of Service.",
          "You must use the service only where you are legally able to do so and only with accurate account and payment information.",
        ],
      },
      {
        title: "Accounts and access",
        paragraphs: [
          "Your CodStats account is personal to you unless we explicitly provide a creator, team, or staff workflow that supports shared management.",
          "You are responsible for the activity taken through your account, including connected authentication, Discord-linked tools, and subscription management actions.",
        ],
      },
      {
        title: "Subscriptions and billing",
        paragraphs: [
          "Paid access is billed through Stripe and renews according to the plan selected at checkout unless cancelled before the next renewal date.",
          "Prices, plan scope, and feature access can change over time. If a future price change applies to your subscription, it will apply only to a future billing period and not retroactively.",
        ],
      },
      {
        title: "Acceptable use",
        paragraphs: [
          "You may not use CodStats to abuse the service, interfere with the platform, scrape private data without permission, bypass access controls, or harm other users.",
          "You may not use creator tools, queue tools, or staff-facing features to mislead users, impersonate another person, or disrupt community play.",
        ],
      },
      {
        title: "Service availability and changes",
        paragraphs: [
          "We may update, improve, suspend, or remove features when needed for reliability, security, moderation, or product changes.",
          "We aim to keep CodStats available and accurate, but we do not guarantee uninterrupted availability, perfect data completeness, or that third-party services will always remain connected.",
        ],
      },
      {
        title: "Intellectual property",
        paragraphs: [
          "CodStats, its branding, software, layouts, and product materials remain the property of CleoAI or its licensors.",
          "Using the service does not transfer ownership of the platform or any protected branding, code, or product assets.",
        ],
      },
      {
        title: "Termination",
        paragraphs: [
          "We may suspend or terminate access if you breach these terms, use the service abusively, create legal or operational risk, or misuse payment flows.",
          "You may stop using the service at any time. Subscription cancellation stops future renewals but does not automatically create a refund right outside the published refund policy.",
        ],
      },
      {
        title: "Liability and contact",
        paragraphs: [
          "CodStats is provided on an as-available basis. To the maximum extent permitted by law, CleoAI is not liable for indirect, incidental, or consequential loss arising from the use of the service.",
          "For policy or account issues, contact us through the support paths made available in CodStats or through CleoAI.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    description:
      "How CodStats collects, uses, stores, and protects account, ranked-session, billing, and analytics data.",
    summary:
      "This policy explains the categories of data CodStats processes, why we process them, how long we keep them, and the choices available to account holders.",
    lastUpdated: POLICY_LAST_UPDATED,
    sections: [
      {
        title: "What we collect",
        bullets: [
          "Account and identity information needed to sign in and manage access.",
          "Ranked-session, match, queue, and creator-tool data generated when you use CodStats.",
          "Billing and subscription records needed to manage paid access and support requests.",
          "Operational, diagnostic, and analytics signals used to keep the service reliable and measure performance.",
        ],
      },
      {
        title: "How we use your data",
        paragraphs: [
          "We use data to run the product, deliver dashboards and creator tools, authenticate users, process payments, prevent abuse, diagnose issues, and improve service quality.",
          "We may also use aggregated or de-identified service data to understand product usage and platform health.",
        ],
      },
      {
        title: "Third-party processors",
        paragraphs: [
          "CodStats uses third-party providers to support authentication, billing, infrastructure, analytics, and related platform operations.",
          "Those providers process only the data needed to perform their role for the service and remain subject to their own platform and security controls.",
        ],
      },
      {
        title: "Retention",
        paragraphs: [
          "We keep account, billing, and product records for as long as needed to operate the service, meet legal obligations, resolve disputes, and enforce product policies.",
          "We may retain backups, logs, and audit records for a reasonable period where required for security, abuse prevention, or financial record-keeping.",
        ],
      },
      {
        title: "Your choices",
        paragraphs: [
          "You can cancel paid access, update billing details through supported flows, and contact us if you need help with account-linked data questions.",
          "Some information may need to be retained even after cancellation where required for security, accounting, fraud prevention, or dispute handling.",
        ],
      },
      {
        title: "Security",
        paragraphs: [
          "We use reasonable technical and organizational measures to protect account and service data, but no internet service can promise absolute security.",
          "If we detect a material security issue affecting the service, we may take protective action including session revocation, service restriction, or user notification where appropriate.",
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    description:
      "How CodStats uses cookies and similar browser storage for sign-in, preferences, service stability, and analytics.",
    summary:
      "CodStats uses essential browser storage for authentication and service delivery, and may also use limited analytics or preference cookies to improve the experience.",
    lastUpdated: POLICY_LAST_UPDATED,
    sections: [
      {
        title: "What cookies are used for",
        paragraphs: [
          "Cookies and similar browser storage help CodStats keep you signed in, remember presentation preferences, protect sessions, and understand site performance.",
          "Some cookies are set directly by CodStats and some may be set by service providers supporting authentication, billing, or analytics.",
        ],
      },
      {
        title: "Essential cookies",
        bullets: [
          "Authentication and session continuity.",
          "Security protections such as sign-in integrity and abuse prevention.",
          "Core application behavior needed to load pages and keep the service stable.",
        ],
      },
      {
        title: "Preference and analytics cookies",
        bullets: [
          "Theme or presentation preferences when the app remembers interface settings.",
          "Site performance and analytics measurements used to understand reliability and usage patterns.",
        ],
      },
      {
        title: "Managing cookies",
        paragraphs: [
          "You can control cookies through your browser settings, but blocking essential cookies may prevent sign-in, billing access, or other core flows from working correctly.",
          "If you clear cookies or local storage, some account or preference state may be reset on your next visit.",
        ],
      },
    ],
  },
  {
    slug: "refunds",
    title: "Refund Policy",
    description:
      "The CodStats refund window, Stripe-fee deduction model, and the cases where subscriptions are not eligible for refund.",
    summary:
      "CodStats offers limited refunds on eligible paid subscriptions within 7 days of purchase. Approved refunds are reduced by the Stripe processing fee charged on the original payment.",
    lastUpdated: POLICY_LAST_UPDATED,
    sections: [
      {
        title: "Refund window",
        paragraphs: [
          "Eligible refund requests must be made within 7 calendar days of the original purchase date.",
          "After that window, you can still cancel the subscription to prevent future renewals, but the completed billing period is not refundable.",
        ],
      },
      {
        title: "Processing fee deduction",
        paragraphs: [POLICY_STRIPE_FEE_NOTE],
      },
      {
        title: "Non-refundable purchases",
        bullets: [
          "Gifted or complimentary plan access is not refundable. That access can be ended or allowed to lapse, but it does not qualify for a cash refund.",
          "Subscriptions purchased using a discount code or coupon are not eligible for refund.",
          "Returns and exchanges do not apply because CodStats is a digital subscription service, not a physical product.",
        ],
      },
      {
        title: "How to request a refund",
        paragraphs: [
          "Contact us through the support paths made available in CodStats and include the account, purchase date, and the reason for the request.",
          "If a refund is approved, it is returned to the original payment method less the Stripe processing fee described above.",
        ],
      },
      {
        title: "Cancellations",
        paragraphs: [
          "Cancelling a subscription stops future renewals. It does not automatically create a refund and does not reverse the published non-refundable cases above.",
        ],
      },
    ],
  },
  {
    slug: "gdpr",
    title: "GDPR Policy",
    description:
      "How CodStats handles UK GDPR and EU GDPR-style data requests, account erasure requests, and the limits that apply to billing and fraud-prevention records.",
    summary:
      "CodStats supports data-rights requests covering access, correction, export, restriction, objection, and erasure. Some records, especially billing and anti-fraud records, may still need to be retained where law or payment-provider obligations require it.",
    lastUpdated: POLICY_LAST_UPDATED,
    sections: [
      {
        title: "Your GDPR rights",
        paragraphs: [
          "If GDPR applies to your use of CodStats, you can request access to your personal data, ask us to correct inaccurate data, ask for a copy of data we hold about your account, or ask us to restrict or erase data where the law gives you that right.",
          "You can also object to certain processing where GDPR gives you that option, including some types of non-essential service analysis or operational review.",
        ],
      },
      {
        title: "How to make a request",
        paragraphs: [
          "Send a GDPR request to the support contact published by CleoAI and include enough detail for us to identify the CodStats account and the request you are making.",
          "We may need to verify account ownership before acting on access, export, correction, or erasure requests so we do not disclose or alter the wrong account data.",
        ],
      },
      {
        title: "Account deletion and product data",
        paragraphs: [
          "Deleting a CodStats account removes active account access and ends future use of the service through that account.",
          "Where possible, we will delete or anonymize CodStats-controlled account data linked to the request. Some operational records, logs, or historical service records may need to be retained for security, abuse prevention, audit, or legal reasons.",
        ],
      },
      {
        title: "Stripe and financial record retention",
        paragraphs: [
          "Stripe-managed billing, invoice, payment, tax, fraud-prevention, and charge-dispute records may not be immediately erasable, even when an account-level erasure request is approved.",
          "We may retain payment and financial records where required to comply with accounting, tax, chargeback, fraud, or legal record-keeping obligations.",
        ],
      },
      {
        title: "Limits and response timing",
        paragraphs: [
          "We may refuse or narrow a request where the law allows us to do so, including where a request is manifestly unfounded, excessive, conflicts with another person's rights, or would require us to retain records that we are legally required to keep.",
          "When GDPR applies, we aim to respond within the time required by law, although complex requests may take longer where the law permits an extension.",
        ],
      },
    ],
  },
  {
    slug: "disputes",
    title: "Disputes Policy",
    description:
      "How CodStats handles billing disputes, chargebacks, fraud concerns, and evidence requests tied to subscription payments.",
    summary:
      "If there is a billing issue, contact CodStats before opening a card dispute where possible. Chargebacks trigger a review process and may affect account access while the case is unresolved.",
    lastUpdated: POLICY_LAST_UPDATED,
    sections: [
      {
        title: "Contact us first",
        paragraphs: [
          "If you believe a payment was taken in error, contact CodStats support first so we can review the charge, cancellation timing, plan state, and refund eligibility before a chargeback is opened.",
        ],
      },
      {
        title: "What happens during a dispute",
        paragraphs: [
          "When a payment dispute or chargeback is opened through the card issuer, we may provide transaction records, service-access logs, subscription records, and related billing evidence to Stripe and the issuing bank.",
          "While a dispute is under review, we may limit or suspend access to paid features tied to the disputed payment.",
        ],
      },
      {
        title: "Fraud and unauthorized use",
        paragraphs: [
          "If you believe a charge was unauthorized, tell us immediately so we can help review account access, connected sign-in history, and any related subscription activity.",
          "We may revoke sessions, pause billing-linked access, or take other protective action while investigating an unauthorized-use report.",
        ],
      },
      {
        title: "Abuse of the disputes process",
        paragraphs: [
          "Opening a payment dispute after receiving a valid refund, after confirmed service delivery, or instead of using the published refund process may be treated as abuse of the billing system.",
          "Where abuse is identified, we may suspend the account, restrict future purchases, or require direct resolution before any new paid access is granted.",
        ],
      },
      {
        title: "Record retention",
        paragraphs: [
          "We retain the billing and audit information reasonably needed to investigate payment issues, respond to disputes, and meet our financial record-keeping obligations.",
        ],
      },
    ],
  },
] as const satisfies readonly PolicyDocument[]

export const POLICY_DOCUMENTS_BY_SLUG = new Map<PolicySlug, PolicyDocument>(
  POLICY_DOCUMENTS.map((policy) => [policy.slug, policy])
)

export function getPolicyDocument(slug: string) {
  return POLICY_DOCUMENTS_BY_SLUG.get(slug as PolicySlug) ?? null
}
