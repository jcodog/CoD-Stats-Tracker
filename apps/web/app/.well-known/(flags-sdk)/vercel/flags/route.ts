import { createFlagsDiscoveryEndpoint } from "flags/next"
import { getProviderData } from "@flags-sdk/vercel"
import { flags } from "../../../../../lib/flags"

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData(flags)
})
