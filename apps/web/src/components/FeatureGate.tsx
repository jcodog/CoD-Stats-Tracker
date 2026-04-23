import { AppFlagKey, isFlagEnabled } from "@/lib/flags"

interface FeatureFlagProps {
  flag: AppFlagKey
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const FeatureGate = async ({
  flag,
  children,
  fallback = null,
}: Readonly<FeatureFlagProps>) => {
  const enabled = await isFlagEnabled(flag)

  if (!enabled) return fallback

  return children
}
