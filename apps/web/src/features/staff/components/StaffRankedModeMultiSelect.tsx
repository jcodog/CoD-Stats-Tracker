"use client"

import { useMemo, useState } from "react"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox"

type StaffRankedModeOption = {
  description?: string
  label: string
  value: string
}

export function StaffRankedModeMultiSelect({
  emptyLabel,
  onChange,
  options,
  placeholder,
  value,
}: {
  emptyLabel: string
  onChange: (values: string[]) => void
  options: StaffRankedModeOption[]
  placeholder: string
  value: string[]
}) {
  const anchorRef = useComboboxAnchor()
  const [query, setQuery] = useState("")
  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value]
  )
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return options
    }

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.value.toLowerCase().includes(normalizedQuery)
    )
  }, [options, query])

  return (
    <Combobox
      items={filteredOptions}
      itemToStringLabel={(item: StaffRankedModeOption) => item.label}
      itemToStringValue={(item: StaffRankedModeOption) => item.value}
      isItemEqualToValue={(
        item: StaffRankedModeOption,
        selectedValue: StaffRankedModeOption
      ) => item.value === selectedValue.value}
      multiple
      onInputValueChange={setQuery}
      onValueChange={(nextValue) =>
        onChange(
          Array.isArray(nextValue)
            ? Array.from(new Set(nextValue.map((item) => item.value)))
            : []
        )
      }
      value={selectedOptions}
    >
      <ComboboxChips className="min-h-11" ref={anchorRef}>
        {selectedOptions.map((option) => (
          <ComboboxChip key={option.value}>{option.label}</ComboboxChip>
        ))}
        <ComboboxChipsInput className="min-w-28" placeholder={placeholder} />
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxList>
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
          <ComboboxCollection>
            {(item: StaffRankedModeOption, index: number) => (
              <ComboboxItem index={index} key={item.value} value={item}>
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  {item.description ? (
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </div>
              </ComboboxItem>
            )}
          </ComboboxCollection>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
