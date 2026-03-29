"use client"

import type { ReactNode } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

export type AppSelectOption = {
  disabled?: boolean
  label: ReactNode
  value: string
}

export function AppSelect({
  className,
  disabled = false,
  id,
  onValueChange,
  options,
  placeholder,
  size = "default",
  value,
}: {
  className?: string
  disabled?: boolean
  id?: string
  onValueChange: (value: string) => void
  options: AppSelectOption[]
  placeholder?: string
  size?: "default" | "sm"
  value?: string | null
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={onValueChange}
      value={value ?? ""}
    >
      <SelectTrigger className={cn("w-full", className)} id={id} size={size}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
