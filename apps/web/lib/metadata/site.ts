import { getAppPublicOrigin } from "@workspace/backend/server/app-public-origin"

export const siteConfig = {
  name: "CodStats",
  shortName: "CodStats",
  seoTitle: "CodStats | Ranked Match Intelligence for Call of Duty",
  description:
    "Track every ranked Call of Duty session, monitor SR movement, and turn match history into clear performance signals with CodStats by CleoAI.",
  locale: "en_US",
  language: "en-US",
  publisherName: "CleoAI",
  publisherUrl: "https://cleoai.cloud",
} as const

export const siteKeywords = [
  "CodStats",
  "Call of Duty ranked stats",
  "COD ranked tracker",
  "SR tracker",
  "match analytics",
  "session analytics",
  "Call of Duty performance analytics",
  "ranked session tracker",
  "CleoAI",
]

export const siteThemeColors = {
  light: "#67c7bf",
  dark: "#11131a",
} as const

export const socialImages = {
  openGraph: {
    url: "/opengraph-image.png",
    width: 1536,
    height: 1024,
    alt: "CodStats social card showing the CodStats brand character with a crimson neon halo and ranked performance graphs.",
  },
  twitter: {
    url: "/twitter-image.png",
    width: 1536,
    height: 1024,
    alt: "CodStats Twitter card showing the CodStats brand character against a crimson neon ring with subtle analytics HUD details.",
  },
} as const

export const robotsDisallow = [
  "/account",
  "/api/",
  "/checkout",
  "/creator-tools",
  "/dashboard",
  "/settings",
  "/sign-in",
  "/sign-up",
  "/staff",
  "/ui/",
] as const

const DEFAULT_SITE_ORIGIN = "https://stats.cleoai.cloud"
const DEFAULT_DEV_ORIGIN = "http://localhost:3000"

function getFallbackSiteOrigin() {
  return process.env.NODE_ENV === "development"
    ? DEFAULT_DEV_ORIGIN
    : DEFAULT_SITE_ORIGIN
}

export function getSiteOrigin() {
  try {
    return getAppPublicOrigin()
  } catch {
    return getFallbackSiteOrigin()
  }
}

export function getSiteUrl(path = "/") {
  return new URL(path, getSiteOrigin())
}

export function getStructuredData() {
  const siteOrigin = getSiteOrigin()
  const logoUrl = new URL("/logo.png", siteOrigin).toString()

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: siteConfig.language,
      publisher: {
        "@type": "Organization",
        name: siteConfig.publisherName,
        url: siteConfig.publisherUrl,
      },
      url: siteOrigin,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      description: siteConfig.description,
      image: logoUrl,
      publisher: {
        "@type": "Organization",
        name: siteConfig.publisherName,
        url: siteConfig.publisherUrl,
      },
      url: siteOrigin,
    },
  ]
}
