import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"

type CreatorCodeNoticeProps = {
  code: string
  discountPercent: number
  layout?: "inline" | "stacked"
}

export function CreatorCodeNotice({
  code,
  discountPercent,
  layout = "inline",
}: CreatorCodeNoticeProps) {
  const isStacked = layout === "stacked"

  return (
    <section
      className={
        isStacked
          ? "grid gap-3 rounded-[1.35rem] border border-border/70 bg-card/90 p-4"
          : "grid gap-3 rounded-[1.6rem] border border-border/70 bg-card/80 p-4 sm:p-5"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="rounded-full px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.18em]">
          Creator code
        </Badge>
        <span className="rounded-full border border-border/70 px-3 py-1 text-sm font-semibold tracking-[0.08em] text-foreground/92">
          {code}
        </span>
      </div>

      <div className={isStacked ? "grid gap-2" : "grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"}>
        <div className="grid gap-1">
          <p className="text-sm font-medium text-foreground">
            {discountPercent}% off your first month is already queued.
          </p>
          <p className="text-sm leading-6 text-foreground/76">
            Keep this code through sign in, sign up, and checkout without
            re-entering it.
          </p>
        </div>
        {!isStacked ? (
          <div className="hidden items-center sm:flex">
            <Separator className="w-10" />
          </div>
        ) : null}
      </div>
    </section>
  )
}
