import { createFlagsDiscoveryEndpoint } from "flags/next"
import { presentationFlags } from "../../../../../lib/flags"
import { getProviderData } from "@flags-sdk/vercel"

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return await getProviderData(presentationFlags)
})
