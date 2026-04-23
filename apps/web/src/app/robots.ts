import type { MetadataRoute } from "next"

import { getSiteOrigin, robotsDisallow } from "@/lib/metadata/site"

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...robotsDisallow],
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  }
}
