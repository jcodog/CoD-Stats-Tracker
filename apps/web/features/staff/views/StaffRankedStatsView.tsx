"use client"

import { useEffect, useState } from "react"
import type { UserRole } from "@workspace/backend/convex/lib/staffRoles"
import type {
  StaffMutationResponse,
  StaffRankedDashboard,
} from "@workspace/backend/convex/lib/staffTypes"
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
  const fallbackTitleKey = data.titles.find((title) => title.isActive)?.key ?? ""

  return {
    activeSeason: String(data.currentConfig?.activeSeason ?? 1),
    activeTitleKey: data.currentConfig?.activeTitleKey ?? fallbackTitleKey,
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

export function StaffRankedStatsView({
  initialData,
}: {
  initialData: StaffRankedDashboard
}) {
  const { data } = useStaffRankedDashboard(initialData)
  const rankedClient = useStaffRankedClient()
  const initialCatalogTitleKey =
    initialData.currentConfig?.activeTitleKey ?? initialData.titles[0]?.key ?? ""
  const [catalogTitleKey, setCatalogTitleKey] = useState(initialCatalogTitleKey)
  const [configForm, setConfigForm] = useState(() => buildDefaultConfigForm(initialData))
  const [titleForm, setTitleForm] = useState<TitleFormState>(buildDefaultTitleForm)
  const [modeForm, setModeForm] = useState<ModeFormState>(() =>
    buildDefaultModeForm(initialCatalogTitleKey)
  )
  const [mapForm, setMapForm] = useState<MapFormState>(() =>
    buildDefaultMapForm(initialCatalogTitleKey)
  )
  const rankedMutation = useStaffMutation<RankedActionRequest, StaffMutationResponse>({
    invalidate: ["ranked"],
    mutationFn: (request) => rankedClient.runAction<StaffMutationResponse>(request),
  })
  const adminEnabled = isAdminRole(data.actorRole)
  const activeTitleOptions = data.titles.filter((title) => title.isActive)

  useEffect(() => {
    setConfigForm(buildDefaultConfigForm(data))
  }, [
    data.currentConfig?.activeSeason,
    data.currentConfig?.activeTitleKey,
    data.titles,
  ])

  useEffect(() => {
    if (
      catalogTitleKey &&
      data.titles.some((title) => title.key === catalogTitleKey)
    ) {
      return
    }

    const fallbackTitleKey =
      data.currentConfig?.activeTitleKey ?? data.titles[0]?.key ?? ""

    setCatalogTitleKey(fallbackTitleKey)
    setModeForm(buildDefaultModeForm(fallbackTitleKey))
    setMapForm(buildDefaultMapForm(fallbackTitleKey))
  }, [catalogTitleKey, data.currentConfig?.activeTitleKey, data.titles])

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
      const activeSeason = parseRequiredInteger(configForm.activeSeason, "Season")

      if (!configForm.activeTitleKey) {
        throw new Error("Select an active title before saving the ranked config.")
      }

      await runRankedAction({
        action: "setCurrentRankedConfig",
        input: {
          activeSeason,
          activeTitleKey: configForm.activeTitleKey,
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid ranked config.")
    }
  }

  async function handleTitleSubmit() {
    try {
      const sortOrder = parseRequiredInteger(titleForm.sortOrder, "Title sort order")

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
          setCatalogTitleKey(nextCatalogTitleKey)
          setModeForm(buildDefaultModeForm(nextCatalogTitleKey))
          setMapForm(buildDefaultMapForm(nextCatalogTitleKey))
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid title details.")
    }
  }

  async function handleModeSubmit() {
    try {
      const sortOrder = parseRequiredInteger(modeForm.sortOrder, "Mode sort order")

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
        setModeForm(buildDefaultModeForm(modeForm.titleKey))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid mode details.")
    }
  }

  async function handleMapSubmit() {
    try {
      const sortOrder = parseRequiredInteger(mapForm.sortOrder, "Map sort order")

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
        setMapForm(buildDefaultMapForm(mapForm.titleKey))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid map details.")
    }
  }

  function handleCatalogTitleChange(nextTitleKey: string) {
    setCatalogTitleKey(nextTitleKey)
    setModeForm(buildDefaultModeForm(nextTitleKey))
    setMapForm(buildDefaultMapForm(nextTitleKey))
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
                updatedAt: data.currentConfig.updatedAt,
              }
            : null
        }
        onActiveSeasonChange={(value) =>
          setConfigForm((current) => ({
            ...current,
            activeSeason: value,
          }))
        }
        onActiveTitleChange={(value) =>
          setConfigForm((current) => ({
            ...current,
            activeTitleKey: value,
          }))
        }
        onSave={() => {
          void handleConfigSubmit()
        }}
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
          onResetMap={() => setMapForm(buildDefaultMapForm(catalogTitleKey))}
          onResetMode={() => setModeForm(buildDefaultModeForm(catalogTitleKey))}
          onResetTitle={() => setTitleForm(buildDefaultTitleForm())}
          onSaveMap={() => {
            void handleMapSubmit()
          }}
          onSaveMode={() => {
            void handleModeSubmit()
          }}
          onSaveTitle={() => {
            void handleTitleSubmit()
          }}
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
