import { createFlagsDiscoveryEndpoint } from "flags/next"
import { flags } from "../../../../../lib/flags"
import { getProviderData } from "@flags-sdk/vercel"

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return await getProviderData(flags)
})
