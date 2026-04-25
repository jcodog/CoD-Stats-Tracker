"use client"

import type { Dispatch, SetStateAction } from "react"
import { useState } from "react"
import type { UserRole } from "@workspace/backend/lib/staffRoles"
import type {
  StaffMutationResponse,
  StaffRankedDashboard,
} from "@workspace/backend/lib/staffTypes"
import { toast } from "sonner"

import { StaffRankedCatalogSection } from "@/features/staff/components/StaffRankedCatalogSection"
import { StaffRankedConfigSection } from "@/features/staff/components/StaffRankedConfigSection"
import { StaffRankedStatsHeader } from "@/features/staff/components/StaffRankedStatsHeader"
import {
  StaffClientError,
  useStaffMutation,
  useStaffRankedClient,
  useStaffRankedDashboard,
} from "@/features/staff/lib/staff-client"
import type { RankedActionRequest } from "@/features/staff/lib/staff-schemas"

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

type ConfigFormState = {
  activeSeason: string
  activeTitleKey: string
  sessionWritesEnabled: boolean
}

function isAdminRole(role: UserRole) {
  return role === "admin" || role === "super_admin"
}

function parseRequiredInteger(value: string, fieldLabel: string) {
  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue)) {
    throw new Error(`${fieldLabel} must be a whole number.`)
  }

  return parsedValue
}

function buildDefaultConfigForm(data: StaffRankedDashboard): ConfigFormState {
  const fallbackTitleKey =
    data.titles.find((title) => title.isActive)?.key ?? ""

  return {
    activeSeason: String(data.currentConfig?.activeSeason ?? 1),
    activeTitleKey: data.currentConfig?.activeTitleKey ?? fallbackTitleKey,
    sessionWritesEnabled: data.currentConfig?.sessionWritesEnabled ?? true,
  }
}

function buildDefaultTitleForm(): TitleFormState {
  return {
    isActive: true,
    key: "",
    label: "",
    sortOrder: "0",
  }
}

function buildDefaultModeForm(titleKey = ""): ModeFormState {
  return {
    isActive: true,
    key: "",
    label: "",
    sortOrder: "0",
    titleKey,
  }
}

function buildDefaultMapForm(titleKey = ""): MapFormState {
  return {
    isActive: true,
    name: "",
    sortOrder: "0",
    supportedModeIds: [],
    titleKey,
  }
}

function resolveCatalogTitleKey(
  data: StaffRankedDashboard,
  preferredTitleKey: string
) {
  if (
    preferredTitleKey &&
    data.titles.some((title) => title.key === preferredTitleKey)
  ) {
    return preferredTitleKey
  }

  return data.currentConfig?.activeTitleKey ?? data.titles[0]?.key ?? ""
}

function normalizeModeForm(
  form: ModeFormState,
  data: StaffRankedDashboard,
  fallbackTitleKey: string
) {
  if (
    form.titleKey &&
    data.titles.some((title) => title.key === form.titleKey)
  ) {
    return form
  }

  return {
    ...form,
    titleKey: fallbackTitleKey,
  }
}

function normalizeMapForm(
  form: MapFormState,
  data: StaffRankedDashboard,
  fallbackTitleKey: string
) {
  if (
    form.titleKey &&
    data.titles.some((title) => title.key === form.titleKey)
  ) {
    return form
  }

  return {
    ...form,
    titleKey: fallbackTitleKey,
  }
}

export function StaffRankedStatsView({
  initialData,
}: {
  initialData: StaffRankedDashboard
}) {
  const { data } = useStaffRankedDashboard(initialData)
  const rankedClient = useStaffRankedClient()
  const initialCatalogTitleKey = resolveCatalogTitleKey(
    initialData,
    initialData.currentConfig?.activeTitleKey ??
      initialData.titles[0]?.key ??
      ""
  )
  const [catalogTitleKeyDraft, setCatalogTitleKeyDraft] = useState(
    initialCatalogTitleKey
  )
  const [configFormDraft, setConfigFormDraft] =
    useState<ConfigFormState | null>(null)
  const [titleForm, setTitleForm] = useState<TitleFormState>(
    buildDefaultTitleForm
  )
  const [modeFormState, setModeFormState] = useState<ModeFormState>(() =>
    buildDefaultModeForm(initialCatalogTitleKey)
  )
  const [mapFormState, setMapFormState] = useState<MapFormState>(() =>
    buildDefaultMapForm(initialCatalogTitleKey)
  )
  const rankedMutation = useStaffMutation<
    RankedActionRequest,
    StaffMutationResponse
  >({
    invalidate: ["ranked"],
    mutationFn: (request) =>
      rankedClient.runAction<StaffMutationResponse>(request),
  })
  const adminEnabled = isAdminRole(data.actorRole)
  const activeTitleOptions = data.titles.filter((title) => title.isActive)
  const catalogTitleKey = resolveCatalogTitleKey(data, catalogTitleKeyDraft)
  const configForm = configFormDraft ?? buildDefaultConfigForm(data)
  const modeForm = normalizeModeForm(modeFormState, data, catalogTitleKey)
  const mapForm = normalizeMapForm(mapFormState, data, catalogTitleKey)

  const setModeForm: Dispatch<SetStateAction<ModeFormState>> = (updater) => {
    setModeFormState((current) => {
      const normalizedCurrent = normalizeModeForm(
        current,
        data,
        catalogTitleKey
      )
      return typeof updater === "function"
        ? (updater as (current: ModeFormState) => ModeFormState)(
            normalizedCurrent
          )
        : updater
    })
  }

  const setMapForm: Dispatch<SetStateAction<MapFormState>> = (updater) => {
    setMapFormState((current) => {
      const normalizedCurrent = normalizeMapForm(current, data, catalogTitleKey)
      return typeof updater === "function"
        ? (updater as (current: MapFormState) => MapFormState)(
            normalizedCurrent
          )
        : updater
    })
  }

  function updateConfigForm(
    updater: (current: ConfigFormState) => ConfigFormState
  ) {
    setConfigFormDraft((current) =>
      updater(current ?? buildDefaultConfigForm(data))
    )
  }

  async function runRankedAction(request: RankedActionRequest) {
    try {
      const result = await rankedMutation.mutateAsync(request)
      toast.success(result.summary)
      return true
    } catch (error) {
      toast.error(
        error instanceof StaffClientError
          ? error.message
          : "Ranked configuration update failed."
      )
      return false
    }
  }

  async function handleConfigSubmit() {
    try {
      const activeSeason = parseRequiredInteger(
        configForm.activeSeason,
        "Season"
      )

      if (!configForm.activeTitleKey) {
        throw new Error(
          "Select an active title before saving the ranked config."
        )
      }

      const succeeded = await runRankedAction({
        action: "setCurrentRankedConfig",
        input: {
          activeSeason,
          activeTitleKey: configForm.activeTitleKey,
          sessionWritesEnabled: configForm.sessionWritesEnabled,
        },
      })

      if (succeeded) {
        setConfigFormDraft(null)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid ranked config."
      )
    }
  }

  async function handleTitleSubmit() {
    try {
      const sortOrder = parseRequiredInteger(
        titleForm.sortOrder,
        "Title sort order"
      )

      const succeeded = await runRankedAction({
        action: "upsertRankedTitle",
        input: {
          isActive: titleForm.isActive,
          key: titleForm.key,
          label: titleForm.label,
          sortOrder,
        },
      })

      if (succeeded) {
        const nextCatalogTitleKey = titleForm.key || catalogTitleKey
        setTitleForm(buildDefaultTitleForm())
        if (nextCatalogTitleKey) {
          setCatalogTitleKeyDraft(nextCatalogTitleKey)
          setModeFormState(buildDefaultModeForm(nextCatalogTitleKey))
          setMapFormState(buildDefaultMapForm(nextCatalogTitleKey))
        }
        return true
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid title details."
      )
    }

    return false
  }

  async function handleModeSubmit() {
    try {
      const sortOrder = parseRequiredInteger(
        modeForm.sortOrder,
        "Mode sort order"
      )

      if (!modeForm.titleKey) {
        throw new Error("Select a title before saving a ranked mode.")
      }

      const succeeded = await runRankedAction({
        action: "upsertRankedMode",
        input: {
          isActive: modeForm.isActive,
          key: modeForm.key,
          label: modeForm.label,
          modeId: modeForm.modeId,
          sortOrder,
          titleKey: modeForm.titleKey,
        },
      })

      if (succeeded) {
        setModeFormState(buildDefaultModeForm(modeForm.titleKey))
        return true
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid mode details."
      )
    }

    return false
  }

  async function handleMapSubmit() {
    try {
      const sortOrder = parseRequiredInteger(
        mapForm.sortOrder,
        "Map sort order"
      )

      if (!mapForm.titleKey) {
        throw new Error("Select a title before saving a map.")
      }

      const succeeded = await runRankedAction({
        action: "upsertRankedMap",
        input: {
          isActive: mapForm.isActive,
          mapId: mapForm.mapId,
          name: mapForm.name,
          sortOrder,
          supportedModeIds: mapForm.supportedModeIds,
          titleKey: mapForm.titleKey,
        },
      })

      if (succeeded) {
        setMapFormState(buildDefaultMapForm(mapForm.titleKey))
        return true
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid map details."
      )
    }

    return false
  }

  function handleCatalogTitleChange(nextTitleKey: string) {
    setCatalogTitleKeyDraft(nextTitleKey)
    setModeFormState(buildDefaultModeForm(nextTitleKey))
    setMapFormState(buildDefaultMapForm(nextTitleKey))
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <StaffRankedStatsHeader
        adminEnabled={adminEnabled}
        currentConfig={
          data.currentConfig
            ? {
                activeSeason: data.currentConfig.activeSeason,
                activeTitleLabel: data.currentConfig.activeTitleLabel,
                sessionWritesEnabled: data.currentConfig.sessionWritesEnabled,
              }
            : null
        }
        openSessionCount={data.openSessionCount}
      />

      <StaffRankedConfigSection
        activeTitleOptions={activeTitleOptions}
        configForm={configForm}
        currentConfig={
          data.currentConfig
            ? {
                activeSeason: data.currentConfig.activeSeason,
                activeTitleLabel: data.currentConfig.activeTitleLabel,
                sessionWritesEnabled: data.currentConfig.sessionWritesEnabled,
                updatedAt: data.currentConfig.updatedAt,
              }
            : null
        }
        onActiveSeasonChange={(value) =>
          updateConfigForm((current) => ({
            ...current,
            activeSeason: value,
          }))
        }
        onActiveTitleChange={(value) =>
          updateConfigForm((current) => ({
            ...current,
            activeTitleKey: value,
          }))
        }
        onSave={() => {
          void handleConfigSubmit()
        }}
        onSessionWritesEnabledChange={(value) =>
          updateConfigForm((current) => ({
            ...current,
            sessionWritesEnabled: value,
          }))
        }
        openSessionCount={data.openSessionCount}
        pending={rankedMutation.isPending}
      />

      {adminEnabled ? (
        <StaffRankedCatalogSection
          catalogTitleKey={catalogTitleKey}
          mapForm={mapForm}
          maps={data.maps}
          modeForm={modeForm}
          modes={data.modes}
          onCatalogTitleChange={handleCatalogTitleChange}
          onResetMap={() =>
            setMapFormState(buildDefaultMapForm(catalogTitleKey))
          }
          onResetMode={() =>
            setModeFormState(buildDefaultModeForm(catalogTitleKey))
          }
          onResetTitle={() => setTitleForm(buildDefaultTitleForm())}
          onSaveMap={handleMapSubmit}
          onSaveMode={handleModeSubmit}
          onSaveTitle={handleTitleSubmit}
          pending={rankedMutation.isPending}
          setMapForm={setMapForm}
          setModeForm={setModeForm}
          setTitleForm={setTitleForm}
          titleForm={titleForm}
          titles={data.titles}
        />
      ) : null}
    </div>
  )
}
