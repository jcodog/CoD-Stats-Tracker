"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { IconPlus, IconSettings } from "@tabler/icons-react"
import type {
  StaffRankedMapRecord,
  StaffRankedModeRecord,
  StaffRankedTitleRecord,
} from "@workspace/backend/convex/lib/staffTypes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { StaffRankedModeMultiSelect } from "@/features/staff/components/StaffRankedModeMultiSelect"

type TitleFormState = {
  isActive: boolean
  key: string
  label: string
  sortOrder: string
}

type ModeFormState = {
  isActive: boolean
  key: string
  label: string
  modeId?: string
  sortOrder: string
  titleKey: string
}

type MapFormState = {
  isActive: boolean
  mapId?: string
  name: string
  sortOrder: string
  supportedModeIds: string[]
  titleKey: string
}

function formatDateTime(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "outline"}>
      {active ? "Active" : "Archived"}
    </Badge>
  )
}

function EmptyWorkspace({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="flex flex-col gap-3 border border-dashed border-border/60 bg-muted/10 px-5 py-5">
      <div className="flex size-10 items-center justify-center border border-border/60 bg-background">
        <IconSettings className="size-5 text-muted-foreground" />
      </div>
      <div className="grid gap-1">
        <div className="font-medium">{title}</div>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function DataTableShell({
  body,
  bodyHeightClass,
  colGroup,
  header,
}: {
  body: React.ReactNode
  bodyHeightClass: string
  colGroup?: React.ReactNode
  header: React.ReactNode
}) {
  return (
    <div className="overflow-hidden border border-border/60 bg-background">
      <Table className="table-fixed">
        {colGroup}
        {header}
      </Table>
      <ScrollArea
        className={cn(
          "w-full *:data-[slot=scroll-area-scrollbar]:hidden",
          bodyHeightClass
        )}
      >
        <Table className="table-fixed">
          {colGroup}
          {body}
        </Table>
      </ScrollArea>
    </div>
  )
}

function CatalogManagementRow({
  actionDisabled = false,
  actionLabel,
  description,
  onAction,
  table,
  tableDescription,
  tableTitle,
  title,
}: {
  actionDisabled?: boolean
  actionLabel: string
  description: string
  onAction: () => void
  table: React.ReactNode
  tableDescription: string
  tableTitle: string
  title: string
}) {
  return (
    <div className="grid gap-6 px-8 py-8">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid min-w-0 flex-1 gap-1">
            <h4 className="text-sm font-medium text-foreground">
              {tableTitle}
            </h4>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {tableDescription}
            </p>
          </div>
          <Button
            className="ml-auto gap-2 self-start"
            disabled={actionDisabled}
            onClick={onAction}
            size="sm"
            variant="ghost"
          >
            <IconPlus aria-hidden="true" className="size-4" />
            {actionLabel}
          </Button>
        </div>
        <div className="w-full">{table}</div>
      </div>
    </div>
  )
}

function CatalogEditorDialog({
  children,
  description,
  onOpenChange,
  onReset,
  onSave,
  open,
  pending,
  resetLabel = "Reset",
  saveDisabled = false,
  saveLabel,
  title,
}: {
  children: React.ReactNode
  description: string
  onOpenChange: (open: boolean) => void
  onReset: () => void
  onSave: () => Promise<boolean>
  open: boolean
  pending: boolean
  resetLabel?: string
  saveDisabled?: boolean
  saveLabel: string
  title: string
}) {
  async function handleSave() {
    const succeeded = await onSave()

    if (succeeded) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[min(88vh,54rem)] flex-col overflow-hidden p-0 sm:max-w-[min(92vw,42rem)]">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 overscroll-contain">
          <div className="px-6 py-6">{children}</div>
        </ScrollArea>

        <DialogFooter className="border-t border-border/60 px-6 py-5 sm:items-center sm:justify-end">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={pending} onClick={onReset} variant="ghost">
            {resetLabel}
          </Button>
          <Button
            disabled={pending || saveDisabled}
            onClick={() => {
              void handleSave()
            }}
          >
            {pending ? "Saving..." : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActiveStatusSelect({
  id,
  onValueChange,
  value,
}: {
  id: string
  onValueChange: (value: "active" | "archived") => void
  value: "active" | "archived"
}) {
  return (
    <Select
      onValueChange={(nextValue) =>
        onValueChange(nextValue as "active" | "archived")
      }
      value={value}
    >
      <SelectTrigger className="w-full" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="archived">Archived</SelectItem>
      </SelectContent>
    </Select>
  )
}

function TitleCatalogForm({
  disabled = false,
  setTitleForm,
  titleForm,
}: {
  disabled?: boolean
  setTitleForm: Dispatch<SetStateAction<TitleFormState>>
  titleForm: TitleFormState
}) {
  return (
    <FieldGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="ranked-title-key">Key</FieldLabel>
          <Input
            autoComplete="off"
            disabled={disabled}
            id="ranked-title-key"
            name="ranked-title-key"
            onChange={(event) =>
              setTitleForm((current) => ({
                ...current,
                key: event.target.value,
              }))
            }
            placeholder="bo7"
            value={titleForm.key}
          />
          <FieldDescription>
            Stable lowercase key used by config, modes, maps, and sessions.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="ranked-title-label">Label</FieldLabel>
          <Input
            autoComplete="off"
            disabled={disabled}
            id="ranked-title-label"
            name="ranked-title-label"
            onChange={(event) =>
              setTitleForm((current) => ({
                ...current,
                label: event.target.value,
              }))
            }
            placeholder="Black Ops 7"
            value={titleForm.label}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="ranked-title-sort">Sort order</FieldLabel>
          <Input
            autoComplete="off"
            disabled={disabled}
            id="ranked-title-sort"
            inputMode="numeric"
            name="ranked-title-sort"
            onChange={(event) =>
              setTitleForm((current) => ({
                ...current,
                sortOrder: event.target.value,
              }))
            }
            value={titleForm.sortOrder}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="ranked-title-status">Status</FieldLabel>
          <ActiveStatusSelect
            id="ranked-title-status"
            onValueChange={(value) =>
              setTitleForm((current) => ({
                ...current,
                isActive: value === "active",
              }))
            }
            value={titleForm.isActive ? "active" : "archived"}
          />
        </Field>
      </div>
    </FieldGroup>
  )
}

function ModeCatalogForm({
  disabled = false,
  modeForm,
  setModeForm,
}: {
  disabled?: boolean
  modeForm: ModeFormState
  setModeForm: Dispatch<SetStateAction<ModeFormState>>
}) {
  return (
    <FieldGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="ranked-mode-key">Mode key</FieldLabel>
          <Input
            autoComplete="off"
            disabled={disabled}
            id="ranked-mode-key"
            name="ranked-mode-key"
            onChange={(event) =>
              setModeForm((current) => ({
                ...current,
                key: event.target.value,
              }))
            }
            placeholder="hardpoint"
            value={modeForm.key}
          />
          <FieldDescription>
            Use a stable key so mode-specific stat fields stay predictable.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="ranked-mode-label">Label</FieldLabel>
          <Input
            autoComplete="off"
            disabled={disabled}
            id="ranked-mode-label"
            name="ranked-mode-label"
            onChange={(event) =>
              setModeForm((current) => ({
                ...current,
                label: event.target.value,
              }))
            }
            placeholder="Hardpoint"
            value={modeForm.label}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="ranked-mode-sort">Sort order</FieldLabel>
          <Input
            autoComplete="off"
            disabled={disabled}
            id="ranked-mode-sort"
            inputMode="numeric"
            name="ranked-mode-sort"
            onChange={(event) =>
              setModeForm((current) => ({
                ...current,
                sortOrder: event.target.value,
              }))
            }
            value={modeForm.sortOrder}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="ranked-mode-status">Status</FieldLabel>
          <ActiveStatusSelect
            id="ranked-mode-status"
            onValueChange={(value) =>
              setModeForm((current) => ({
                ...current,
                isActive: value === "active",
              }))
            }
            value={modeForm.isActive ? "active" : "archived"}
          />
        </Field>
      </div>
    </FieldGroup>
  )
}

function MapCatalogForm({
  activeTitleModes,
  availableModeOptions,
  disabled = false,
  mapForm,
  setMapForm,
}: {
  activeTitleModes: StaffRankedModeRecord[]
  availableModeOptions: Array<{
    description: string
    label: string
    value: string
  }>
  disabled?: boolean
  mapForm: MapFormState
  setMapForm: Dispatch<SetStateAction<MapFormState>>
}) {
  return (
    <FieldGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="ranked-map-name">Map name</FieldLabel>
          <Input
            autoComplete="off"
            disabled={disabled}
            id="ranked-map-name"
            name="ranked-map-name"
            onChange={(event) =>
              setMapForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="Vault"
            value={mapForm.name}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="ranked-map-sort">Sort order</FieldLabel>
          <Input
            autoComplete="off"
            disabled={disabled}
            id="ranked-map-sort"
            inputMode="numeric"
            name="ranked-map-sort"
            onChange={(event) =>
              setMapForm((current) => ({
                ...current,
                sortOrder: event.target.value,
              }))
            }
            value={mapForm.sortOrder}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="ranked-map-status">Status</FieldLabel>
          <ActiveStatusSelect
            id="ranked-map-status"
            onValueChange={(value) =>
              setMapForm((current) => ({
                ...current,
                isActive: value === "active",
              }))
            }
            value={mapForm.isActive ? "active" : "archived"}
          />
        </Field>
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="ranked-map-modes">Supported modes</FieldLabel>
          <StaffRankedModeMultiSelect
            emptyLabel={
              activeTitleModes.length === 0
                ? "Add active modes for this title first."
                : "No matching modes."
            }
            onChange={(values) =>
              setMapForm((current) => ({
                ...current,
                supportedModeIds: values,
              }))
            }
            options={availableModeOptions}
            placeholder={
              activeTitleModes.length === 0
                ? "No active modes"
                : "Select one or more modes"
            }
            value={mapForm.supportedModeIds}
          />
          <FieldDescription>
            At least one mode is required. The match logger only shows this map
            after one of these modes is selected.
          </FieldDescription>
        </Field>
      </div>
    </FieldGroup>
  )
}

function TitleCatalogTable({
  onEdit,
  titles,
}: {
  onEdit: (title: StaffRankedTitleRecord) => void
  titles: StaffRankedTitleRecord[]
}) {
  if (titles.length === 0) {
    return (
      <EmptyWorkspace
        description="Create the first ranked title here before staff can point the current ranked config at it."
        title="No ranked titles yet"
      />
    )
  }

  return (
    <DataTableShell
      body={
        <TableBody className="[&_tr]:h-17">
          {titles.map((title) => (
            <TableRow key={title.key}>
              <TableCell>
                <div className="grid gap-1">
                  <div className="font-medium">{title.label}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {title.key}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge active={title.isActive} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {title.activeModeCount}/{title.modeCount}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {title.activeMapCount}/{title.mapCount}
              </TableCell>
              <TableCell>{title.sortOrder}</TableCell>
              <TableCell className="text-right">
                <Button
                  onClick={() => onEdit(title)}
                  size="sm"
                  variant="outline"
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      }
      bodyHeightClass="h-[272px]"
      colGroup={
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[14%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[18%]" />
        </colgroup>
      }
      header={
        <TableHeader className="[&_th]:bg-background [&_tr]:border-b">
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Modes</TableHead>
            <TableHead>Maps</TableHead>
            <TableHead>Sort</TableHead>
            <TableHead className="w-24 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
      }
    />
  )
}

function ModeCatalogTable({
  modes,
  onEdit,
}: {
  modes: StaffRankedModeRecord[]
  onEdit: (mode: StaffRankedModeRecord) => void
}) {
  if (modes.length === 0) {
    return (
      <EmptyWorkspace
        description="Add the ranked modes this title actually supports before maps can be configured for logging."
        title="No modes for this title"
      />
    )
  }

  return (
    <DataTableShell
      body={
        <TableBody className="[&_tr]:h-17">
          {modes.map((mode) => (
            <TableRow key={mode.id}>
              <TableCell>
                <div className="grid gap-1">
                  <div className="font-medium">{mode.label}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {mode.key}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge active={mode.isActive} />
              </TableCell>
              <TableCell>{mode.sortOrder}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(mode.updatedAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  onClick={() => onEdit(mode)}
                  size="sm"
                  variant="outline"
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      }
      bodyHeightClass="h-[272px]"
      colGroup={
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[16%]" />
          <col className="w-[10%]" />
          <col className="w-[20%]" />
          <col className="w-[12%]" />
        </colgroup>
      }
      header={
        <TableHeader className="[&_th]:bg-background [&_tr]:border-b">
          <TableRow>
            <TableHead>Mode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sort</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-24 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
      }
    />
  )
}

function MapCatalogTable({
  maps,
  onEdit,
}: {
  maps: StaffRankedMapRecord[]
  onEdit: (map: StaffRankedMapRecord) => void
}) {
  if (maps.length === 0) {
    return (
      <EmptyWorkspace
        description="Add maps after the ranked modes are in place. Each map must support at least one mode."
        title="No maps for this title"
      />
    )
  }

  return (
    <DataTableShell
      body={
        <TableBody className="[&_tr]:h-18">
          {maps.map((map) => (
            <TableRow key={map.id}>
              <TableCell>
                <div className="grid gap-1">
                  <div className="font-medium">{map.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated {formatDateTime(map.updatedAt)}
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-65">
                <div className="flex max-h-12 flex-wrap gap-2 overflow-hidden">
                  {map.supportedModeLabels.map((label) => (
                    <Badge key={`${map.id}-${label}`} variant="outline">
                      {label}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge active={map.isActive} />
              </TableCell>
              <TableCell>{map.sortOrder}</TableCell>
              <TableCell className="text-right">
                <Button onClick={() => onEdit(map)} size="sm" variant="outline">
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      }
      bodyHeightClass="h-[288px]"
      colGroup={
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[34%]" />
          <col className="w-[12%]" />
          <col className="w-[8%]" />
          <col className="w-[16%]" />
        </colgroup>
      }
      header={
        <TableHeader className="[&_th]:bg-background [&_tr]:border-b">
          <TableRow>
            <TableHead>Map</TableHead>
            <TableHead>Supported modes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sort</TableHead>
            <TableHead className="w-30 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
      }
    />
  )
}

export function StaffRankedCatalogSection({
  catalogTitleKey,
  mapForm,
  maps,
  modeForm,
  modes,
  onCatalogTitleChange,
  onResetMap,
  onResetMode,
  onResetTitle,
  onSaveMap,
  onSaveMode,
  onSaveTitle,
  pending,
  setMapForm,
  setModeForm,
  setTitleForm,
  titleForm,
  titles,
}: {
  catalogTitleKey: string
  mapForm: MapFormState
  maps: StaffRankedMapRecord[]
  modeForm: ModeFormState
  modes: StaffRankedModeRecord[]
  onCatalogTitleChange: (value: string) => void
  onResetMap: () => void
  onResetMode: () => void
  onResetTitle: () => void
  onSaveMap: () => Promise<boolean>
  onSaveMode: () => Promise<boolean>
  onSaveTitle: () => Promise<boolean>
  pending: boolean
  setMapForm: Dispatch<SetStateAction<MapFormState>>
  setModeForm: Dispatch<SetStateAction<ModeFormState>>
  setTitleForm: Dispatch<SetStateAction<TitleFormState>>
  titleForm: TitleFormState
  titles: StaffRankedTitleRecord[]
}) {
  const [editorState, setEditorState] = useState<{
    kind: "map" | "mode" | "title"
    mode: "create" | "edit"
  } | null>(null)
  const selectedTitle =
    titles.find((title) => title.key === catalogTitleKey) ?? null
  const titleModes = modes.filter((mode) => mode.titleKey === catalogTitleKey)
  const titleMaps = maps.filter((map) => map.titleKey === catalogTitleKey)
  const activeTitleModes = titleModes.filter((mode) => mode.isActive)
  const activeTitleMapCount = titleMaps.filter((map) => map.isActive).length
  const availableModeOptions = activeTitleModes.map((mode) => ({
    description: mode.key,
    label: mode.label,
    value: mode.id,
  }))
  const titleDialogOpen = editorState?.kind === "title"
  const modeDialogOpen = editorState?.kind === "mode"
  const mapDialogOpen = editorState?.kind === "map"

  function handleEditorOpenChange(
    kind: "map" | "mode" | "title",
    open: boolean
  ) {
    setEditorState((current) => {
      if (open) {
        return current ?? { kind, mode: "create" }
      }

      return current?.kind === kind ? null : current
    })
  }

  function openTitleCreate() {
    onResetTitle()
    setEditorState({ kind: "title", mode: "create" })
  }

  function openTitleEdit(title: StaffRankedTitleRecord) {
    setTitleForm({
      isActive: title.isActive,
      key: title.key,
      label: title.label,
      sortOrder: String(title.sortOrder),
    })
    setEditorState({ kind: "title", mode: "edit" })
  }

  function openModeCreate() {
    onResetMode()
    setEditorState({ kind: "mode", mode: "create" })
  }

  function openModeEdit(mode: StaffRankedModeRecord) {
    setModeForm({
      isActive: mode.isActive,
      key: mode.key,
      label: mode.label,
      modeId: mode.id,
      sortOrder: String(mode.sortOrder),
      titleKey: mode.titleKey,
    })
    setEditorState({ kind: "mode", mode: "edit" })
  }

  function openMapCreate() {
    onResetMap()
    setEditorState({ kind: "map", mode: "create" })
  }

  function openMapEdit(map: StaffRankedMapRecord) {
    setMapForm({
      isActive: map.isActive,
      mapId: map.id,
      name: map.name,
      sortOrder: String(map.sortOrder),
      supportedModeIds: map.supportedModeIds.filter((modeId) =>
        activeTitleModes.some((mode) => mode.id === modeId)
      ),
      titleKey: map.titleKey,
    })
    setEditorState({ kind: "map", mode: "edit" })
  }

  return (
    <>
      <section className="overflow-hidden border border-border/60 bg-background">
        <div className="border-b border-border/60 px-8 py-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-end">
            <div className="grid gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Ranked catalog
              </h2>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Keep the rollout catalog lean. Titles are admin-managed, modes
                stay title-scoped, and each map must support one or more active
                modes before the flagged dashboard can log against it.
              </p>
            </div>

            <Field className="grid gap-2 xl:justify-self-end">
              <FieldLabel htmlFor="ranked-catalog-title">
                Catalog title
              </FieldLabel>
              <Select
                disabled={titles.length === 0}
                onValueChange={onCatalogTitleChange}
                value={catalogTitleKey || undefined}
              >
                <SelectTrigger
                  className="w-full min-w-70"
                  id="ranked-catalog-title"
                >
                  <SelectValue placeholder="Select a title" />
                </SelectTrigger>
                <SelectContent>
                  {titles.map((title) => (
                    <SelectItem key={title.key} value={title.key}>
                      {title.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Selected title</span>
              <span className="font-medium text-foreground">
                {selectedTitle?.label ?? "No title selected"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Active modes</span>
              <span className="font-medium text-foreground">
                {activeTitleModes.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Active maps</span>
              <span className="font-medium text-foreground">
                {activeTitleMapCount}
              </span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/60">
          <CatalogManagementRow
            actionLabel="Create title"
            description="Create and maintain the ranked titles staff can activate. Keep the key stable because config, modes, maps, and sessions all reference it."
            onAction={openTitleCreate}
            table={<TitleCatalogTable onEdit={openTitleEdit} titles={titles} />}
            tableDescription="Titles staff can point the current ranked config at, with their current mode and map counts."
            tableTitle="Saved titles"
            title="Game titles"
          />

          <CatalogManagementRow
            actionDisabled={!selectedTitle}
            actionLabel="Create mode"
            description={
              selectedTitle
                ? `Create and order the ranked modes ${selectedTitle.label} supports. The match logger only offers active modes from this title.`
                : "Choose a catalog title above before creating or editing ranked modes."
            }
            onAction={openModeCreate}
            table={
              selectedTitle ? (
                <ModeCatalogTable modes={titleModes} onEdit={openModeEdit} />
              ) : (
                <EmptyWorkspace
                  description="Choose a title above to load the ranked modes attached to it."
                  title="No title selected"
                />
              )
            }
            tableDescription={
              selectedTitle
                ? `Active and archived ranked modes for ${selectedTitle.label}.`
                : "Choose a title to load its ranked mode list."
            }
            tableTitle={
              selectedTitle ? `${selectedTitle.label} modes` : "Mode list"
            }
            title="Ranked modes"
          />

          <CatalogManagementRow
            actionDisabled={!selectedTitle}
            actionLabel="Create map"
            description={
              selectedTitle
                ? `Maps for ${selectedTitle.label} must support one or more active modes. The match logger filters maps after the user picks a mode.`
                : "Choose a catalog title above before creating or editing maps."
            }
            onAction={openMapCreate}
            table={
              selectedTitle ? (
                <MapCatalogTable maps={titleMaps} onEdit={openMapEdit} />
              ) : (
                <EmptyWorkspace
                  description="Choose a title above to load the maps attached to it."
                  title="No title selected"
                />
              )
            }
            tableDescription={
              selectedTitle
                ? `Saved maps for ${selectedTitle.label}, including the modes each map supports.`
                : "Choose a title to load its map list."
            }
            tableTitle={
              selectedTitle ? `${selectedTitle.label} maps` : "Map list"
            }
            title="Maps"
          />
        </div>

        <div className="border-t border-border/60 px-8 py-4 text-sm text-muted-foreground">
          Modes remain title-specific in v1. Maps can support multiple modes but
          must keep at least one supported mode.
        </div>
      </section>

      <CatalogEditorDialog
        description={
          editorState?.kind === "title" && editorState.mode === "edit"
            ? "Update the selected ranked title without leaving the catalog page."
            : "Create a ranked title staff can activate in the current config."
        }
        onOpenChange={(open) => handleEditorOpenChange("title", open)}
        onReset={onResetTitle}
        onSave={onSaveTitle}
        open={titleDialogOpen}
        pending={pending}
        saveLabel="Save title"
        title={
          editorState?.kind === "title" && editorState.mode === "edit"
            ? "Edit title"
            : "Create title"
        }
      >
        <TitleCatalogForm
          disabled={pending}
          setTitleForm={setTitleForm}
          titleForm={titleForm}
        />
      </CatalogEditorDialog>

      <CatalogEditorDialog
        description={
          selectedTitle
            ? editorState?.kind === "mode" && editorState.mode === "edit"
              ? `Update a ranked mode for ${selectedTitle.label}.`
              : `Create a ranked mode for ${selectedTitle.label}.`
            : "Choose a catalog title before editing ranked modes."
        }
        onOpenChange={(open) => handleEditorOpenChange("mode", open)}
        onReset={onResetMode}
        onSave={onSaveMode}
        open={modeDialogOpen}
        pending={pending}
        saveLabel="Save mode"
        title={
          editorState?.kind === "mode" && editorState.mode === "edit"
            ? "Edit mode"
            : "Create mode"
        }
      >
        <ModeCatalogForm
          disabled={pending}
          modeForm={modeForm}
          setModeForm={setModeForm}
        />
      </CatalogEditorDialog>

      <CatalogEditorDialog
        description={
          selectedTitle
            ? editorState?.kind === "map" && editorState.mode === "edit"
              ? `Update a supported map for ${selectedTitle.label}.`
              : `Create a supported map for ${selectedTitle.label}.`
            : "Choose a catalog title before editing maps."
        }
        onOpenChange={(open) => handleEditorOpenChange("map", open)}
        onReset={onResetMap}
        onSave={onSaveMap}
        open={mapDialogOpen}
        pending={pending}
        saveDisabled={activeTitleModes.length === 0}
        saveLabel="Save map"
        title={
          editorState?.kind === "map" && editorState.mode === "edit"
            ? "Edit map"
            : "Create map"
        }
      >
        <MapCatalogForm
          activeTitleModes={activeTitleModes}
          availableModeOptions={availableModeOptions}
          disabled={pending}
          mapForm={mapForm}
          setMapForm={setMapForm}
        />
      </CatalogEditorDialog>
    </>
  )
}
