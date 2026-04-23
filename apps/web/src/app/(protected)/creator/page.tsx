import { CreatorHomeView } from "@/features/creator-panel/views/CreatorHomeView"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Creator")

export default function CreatorHomePage() {
  return <CreatorHomeView />
}
