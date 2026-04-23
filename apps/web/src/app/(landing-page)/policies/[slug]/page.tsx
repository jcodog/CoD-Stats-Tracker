import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  getPolicyDocument,
  POLICY_DOCUMENTS,
} from "@/features/policies/lib/policies"
import { PolicyDetailView } from "@/features/policies/views/PolicyDetailView"
import { getSiteUrl } from "@/lib/metadata/site"

export function generateStaticParams() {
  return POLICY_DOCUMENTS.map((policy) => ({ slug: policy.slug }))
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const policy = getPolicyDocument(slug)

    if (!policy) {
      return {
        title: "Policy not found",
      }
    }

    return {
      title: policy.title,
      description: policy.description,
      alternates: {
        canonical: getSiteUrl(`/policies/${policy.slug}`).toString(),
      },
    }
  })
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const policy = getPolicyDocument(slug)

  if (!policy) {
    notFound()
  }

  return <PolicyDetailView policy={policy} />
}
