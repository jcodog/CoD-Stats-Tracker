import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/backend", "@workspace/ui"],
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  // Use this when developing the app
  // devIndicators: {
  //   position: "bottom-right",
  // },
  // Use this one when getting marketting images/screenshots
  devIndicators: false,
  async rewrites() {
    if (process.env.VERCEL_ENV !== "preview") {
      return []
    }

    return [
      {
        source: "/coverage",
        destination: "/coverage/index.html",
      },
    ]
  },
}

export default nextConfig
