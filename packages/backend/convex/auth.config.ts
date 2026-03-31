import { AuthConfig } from "convex/server";
import { getConvexAuthEnv } from "./env";

export default {
  providers: [
    {
      // Replace with your own Clerk Issuer URL from your "convex" JWT template.
      // See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
      domain: getConvexAuthEnv().CLERK_JWT_ISSUER_URL ?? "",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
