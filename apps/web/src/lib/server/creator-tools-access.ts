import "server-only"

import { getViewer } from "@/lib/server/viewer"

export async function getCreatorToolsAccessState() {
  const viewer = await getViewer()
  return {
    hasCreatorAccess: viewer.access?.hasCreatorAccess ?? false,
    isSignedIn: Boolean(viewer.userId),
  }
}
