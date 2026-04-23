"use client"

import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

export function StaffPageIntro({
  description,
  meta,
  title,
}: {
  description: ReactNode
  meta?: ReactNode
  title: ReactNode
}) {
  return (
    <div className="grid gap-2 border-b border-border/60 pb-5">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        {title}
      </h1>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}
    </div>
  )
}

export function StaffMetricStrip({
  className,
  columnsClassName,
  items,
}: {
  className?: string
  columnsClassName?: string
  items: Array<{ label: ReactNode; value: ReactNode }>
}) {
  return (
    <section
      className={cn(
        "overflow-hidden border border-border/60 bg-background",
        className
      )}
    >
      <dl
        className={cn(
          "grid gap-px bg-border/60 md:grid-cols-2 xl:grid-cols-4",
          columnsClassName
        )}
      >
        {items.map((item) => (
          <div className="bg-background px-4 py-4 md:px-5" key={String(item.label)}>
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function StaffSection({
  action,
  children,
  className,
  contentClassName,
  description,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  description?: ReactNode
  title: ReactNode
}) {
  return (
    <section
      className={cn(
        "overflow-hidden border border-border/60 bg-background",
        className
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 md:px-5 md:py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("px-4 py-4 md:px-5 md:py-5", contentClassName)}>
        {children}
      </div>
    </section>
  )
}

export function StaffKeyValueGrid({
  className,
  columnsClassName,
  rows,
}: {
  className?: string
  columnsClassName?: string
  rows: Array<{ label: ReactNode; value: ReactNode }>
}) {
  return (
    <dl
      className={cn(
        "grid gap-px bg-border/60",
        columnsClassName ?? "md:grid-cols-2",
        className
      )}
    >
      {rows.map((row) => (
        <div
          className="flex items-center justify-between gap-4 bg-background px-4 py-3 text-sm md:px-5"
          key={String(row.label)}
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
