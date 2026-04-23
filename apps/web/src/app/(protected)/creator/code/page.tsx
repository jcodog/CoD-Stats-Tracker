import { CreatorCodeView } from "@/features/creator-panel/views/CreatorCodeView"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Creator Code")

export default function CreatorCodePage() {
  return <CreatorCodeView />
}
