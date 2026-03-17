import Link from "next/link"

import { getCreatorToolsAccessState } from "@/lib/server/creator-tools-access"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export async function DashboardView() {
  const creatorToolsAccess = await getCreatorToolsAccessState()

  return (
    <section className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-2xl border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">This is the dashboard home</CardTitle>
          <CardDescription>
            Your stats workspace is still expanding. Creator tools now have a
            dedicated operational surface for Play With Viewers.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-wrap items-center gap-3">
          {creatorToolsAccess.hasCreatorAccess ? (
            <Button asChild>
              <Link href="/creator-tools/play-with-viewers">
                Open Play With Viewers
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/account">Manage account settings</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
