"use client"

import type { Dispatch, SetStateAction } from "react"
import { IconSettings } from "@tabler/icons-react"
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
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/60 bg-muted/10 px-5 py-5">
      <div className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-background">
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
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <Table className="table-fixed">
        {colGroup}
        {header}
      </Table>
      <ScrollArea
        className={cn(
          "w-full [&>[data-slot=scroll-area-scrollbar]]:hidden",
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
  description,
  form,
  table,
  tableDescription,
  tableTitle,
  title,
}: {
  description: string
  form: React.ReactNode
  table: React.ReactNode
  tableDescription: string
  tableTitle: string
  title: string
}) {
  return (
    <div className="grid gap-10 px-8 py-8 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
      <div className="grid content-start gap-5">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="max-w-lg text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {form}
      </div>

      <div className="grid content-start gap-4">
        <div className="grid gap-1">
          <h4 className="text-sm font-medium text-foreground">{tableTitle}</h4>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {tableDescription}
          </p>
        </div>
        {table}
      </div>
    </div>
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
  onResetTitle,
  onSaveTitle,
  pending,
  setTitleForm,
  titleForm,
}: {
  onResetTitle: () => void
  onSaveTitle: () => void
  pending: boolean
  setTitleForm: Dispatch<SetStateAction<TitleFormState>>
  titleForm: TitleFormState
}) {
  return (
    <>
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ranked-title-key">Key</FieldLabel>
            <Input
              autoComplete="off"
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

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} onClick={onSaveTitle}>
          {pending ? "Saving..." : "Save title"}
        </Button>
        <Button disabled={pending} onClick={onResetTitle} variant="outline">
          Reset
        </Button>
      </div>
    </>
  )
}

function ModeCatalogForm({
  modeForm,
  onResetMode,
  onSaveMode,
  pending,
  setModeForm,
}: {
  modeForm: ModeFormState
  onResetMode: () => void
  onSaveMode: () => void
  pending: boolean
  setModeForm: Dispatch<SetStateAction<ModeFormState>>
}) {
  return (
    <>
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ranked-mode-key">Mode key</FieldLabel>
            <Input
              autoComplete="off"
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

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} onClick={onSaveMode}>
          {pending ? "Saving..." : "Save mode"}
        </Button>
        <Button disabled={pending} onClick={onResetMode} variant="outline">
          Reset
        </Button>
      </div>
    </>
  )
}

function MapCatalogForm({
  activeTitleModes,
  availableModeOptions,
  mapForm,
  onResetMap,
  onSaveMap,
  pending,
  setMapForm,
}: {
  activeTitleModes: StaffRankedModeRecord[]
  availableModeOptions: Array<{
    description: string
    label: string
    value: string
  }>
  mapForm: MapFormState
  onResetMap: () => void
  onSaveMap: () => void
  pending: boolean
  setMapForm: Dispatch<SetStateAction<MapFormState>>
}) {
  return (
    <>
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ranked-map-name">Map name</FieldLabel>
            <Input
              autoComplete="off"
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
              At least one mode is required. The match logger only shows this
              map after one of these modes is selected.
            </FieldDescription>
          </Field>
        </div>
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={pending || activeTitleModes.length === 0}
          onClick={onSaveMap}
        >
          {pending ? "Saving..." : "Save map"}
        </Button>
        <Button disabled={pending} onClick={onResetMap} variant="outline">
          Reset
        </Button>
      </div>
    </>
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
        <TableBody className="[&_tr]:h-[68px]">
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
            <TableHead className="w-[96px] text-right">Action</TableHead>
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
        <TableBody className="[&_tr]:h-[68px]">
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
            <TableHead className="w-[96px] text-right">Action</TableHead>
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
        <TableBody className="[&_tr]:h-[72px]">
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
              <TableCell className="max-w-[260px]">
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
            <TableHead className="w-[120px] text-right">Action</TableHead>
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
  onSaveMap: () => void
  onSaveMode: () => void
  onSaveTitle: () => void
  pending: boolean
  setMapForm: Dispatch<SetStateAction<MapFormState>>
  setModeForm: Dispatch<SetStateAction<ModeFormState>>
  setTitleForm: Dispatch<SetStateAction<TitleFormState>>
  titleForm: TitleFormState
  titles: StaffRankedTitleRecord[]
}) {
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

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
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
                className="w-full min-w-[280px]"
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
          description="Create and maintain the ranked titles staff can activate. Keep the key stable because config, modes, maps, and sessions all reference it."
          form={
            <TitleCatalogForm
              onResetTitle={onResetTitle}
              onSaveTitle={onSaveTitle}
              pending={pending}
              setTitleForm={setTitleForm}
              titleForm={titleForm}
            />
          }
          table={
            <TitleCatalogTable
              onEdit={(title) =>
                setTitleForm({
                  isActive: title.isActive,
                  key: title.key,
                  label: title.label,
                  sortOrder: String(title.sortOrder),
                })
              }
              titles={titles}
            />
          }
          tableDescription="Titles staff can point the current ranked config at, with their current mode and map counts."
          tableTitle="Saved titles"
          title="Game titles"
        />

        <CatalogManagementRow
          description={
            selectedTitle
              ? `Create and order the ranked modes ${selectedTitle.label} supports. The match logger only offers active modes from this title.`
              : "Choose a catalog title above before creating or editing ranked modes."
          }
          form={
            selectedTitle ? (
              <ModeCatalogForm
                modeForm={modeForm}
                onResetMode={onResetMode}
                onSaveMode={onSaveMode}
                pending={pending}
                setModeForm={setModeForm}
              />
            ) : (
              <div className="grid gap-2 pt-1 text-sm text-muted-foreground">
                <p>
                  Pick a title first. Modes remain scoped to a single title in
                  v1.
                </p>
                <p>
                  Once a title is selected, you can define the valid ranked
                  modes and keep their ordering stable for logging.
                </p>
              </div>
            )
          }
          table={
            selectedTitle ? (
              <ModeCatalogTable
                modes={titleModes}
                onEdit={(mode) =>
                  setModeForm({
                    isActive: mode.isActive,
                    key: mode.key,
                    label: mode.label,
                    modeId: mode.id,
                    sortOrder: String(mode.sortOrder),
                    titleKey: mode.titleKey,
                  })
                }
              />
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
          description={
            selectedTitle
              ? `Maps for ${selectedTitle.label} must support one or more active modes. The match logger filters maps after the user picks a mode.`
              : "Choose a catalog title above before creating or editing maps."
          }
          form={
            selectedTitle ? (
              <MapCatalogForm
                activeTitleModes={activeTitleModes}
                availableModeOptions={availableModeOptions}
                mapForm={mapForm}
                onResetMap={onResetMap}
                onSaveMap={onSaveMap}
                pending={pending}
                setMapForm={setMapForm}
              />
            ) : (
              <div className="grid gap-2 pt-1 text-sm text-muted-foreground">
                <p>Pick a title before managing its maps.</p>
                <p>
                  Maps are filtered by title and must keep at least one active
                  mode so the logger only shows valid map choices.
                </p>
              </div>
            )
          }
          table={
            selectedTitle ? (
              <MapCatalogTable
                maps={titleMaps}
                onEdit={(map) =>
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
                }
              />
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
  )
}
