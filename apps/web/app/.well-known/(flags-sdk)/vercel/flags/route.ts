import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next"
import { flags } from "../../../../../lib/flags"

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData(flags)
})
