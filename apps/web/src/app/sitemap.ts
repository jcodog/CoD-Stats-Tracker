import type { MetadataRoute } from "next"

import { POLICY_DOCUMENTS } from "@/features/policies/lib/policies"
import { getSiteUrl } from "@/lib/metadata/site"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getSiteUrl("/").toString(),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: getSiteUrl("/policies").toString(),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: getSiteUrl("/pricing").toString(),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...POLICY_DOCUMENTS.map((policy) => ({
      url: getSiteUrl(`/policies/${policy.slug}`).toString(),
      lastModified: new Date(policy.lastUpdated),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
