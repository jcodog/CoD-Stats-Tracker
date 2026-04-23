"use client"

import { useState, type ReactNode } from "react"
import {
  IconAlertTriangle,
  IconDotsVertical,
  IconHammer,
} from "@tabler/icons-react"
import {
  isAdminCapableRole,
  type AssignableUserRole,
} from "@workspace/backend/convex/lib/staffRoles"
import {
  canActorBanManagementUser,
  getAllowedRoleOptionsForManagementUser,
  getBanRestrictionMessageForManagementUser,
} from "@workspace/backend/convex/lib/staffManagementPermissions"
import type {
  StaffManagementDashboard,
  StaffManagementUserRecord,
  StaffMutationResponse,
} from "@workspace/backend/convex/lib/staffTypes"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"

import {
  StaffMetricStrip,
  StaffPageIntro,
  StaffSection,
} from "@/features/staff/components/StaffConsolePrimitives"
import {
  StaffClientError,
  useStaffManagementClient,
  useStaffManagementDashboard,
  useStaffMutation,
} from "@/features/staff/lib/staff-client"
import { StaffDataTable } from "@/features/staff/components/StaffDataTable"
import type { ManagementActionRequest } from "@/features/staff/lib/staff-schemas"

function DirectoryBadge({
  children,
  variant = "secondary",
}: {
  children: ReactNode
  variant?: "destructive" | "outline" | "secondary"
}) {
  return (
    <Badge
      className={cn(
        "rounded-md px-1.5 font-normal shadow-none",
        variant === "outline" && "border-border/60 text-muted-foreground"
      )}
      variant={variant}
    >
      {children}
    </Badge>
  )
}

function RoleBadge({
  role,
}: {
  role:
    | StaffManagementUserRecord["clerkRole"]
    | StaffManagementUserRecord["convexRole"]
}) {
  if (!role) {
    return <DirectoryBadge variant="outline">Missing</DirectoryBadge>
  }

  if (role === "super_admin") {
    return <DirectoryBadge>Super admin</DirectoryBadge>
  }

  if (role === "admin") {
    return <DirectoryBadge>Admin</DirectoryBadge>
  }

  if (role === "staff") {
    return <DirectoryBadge>Staff</DirectoryBadge>
  }

  return <DirectoryBadge variant="outline">User</DirectoryBadge>
}

function RoleStatusBadge({ user }: { user: StaffManagementUserRecord }) {
  if (user.roleStatus === "matched") {
    return <DirectoryBadge>Aligned</DirectoryBadge>
  }

  return <DirectoryBadge variant="destructive">Attention</DirectoryBadge>
}

function buildRoleOptionLabel(role: AssignableUserRole) {
  switch (role) {
    case "admin":
      return "Set as admin"
    case "staff":
      return "Set as staff"
    case "user":
      return "Set as user"
  }
}

export function StaffManagementView({
  initialData,
}: {
  initialData: StaffManagementDashboard
}) {
  const { data } = useStaffManagementDashboard(initialData)
  const managementClient = useStaffManagementClient()
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    nextRole: AssignableUserRole
    user: StaffManagementUserRecord
  } | null>(null)
  const [pendingBanUser, setPendingBanUser] =
    useState<StaffManagementUserRecord | null>(null)
  const alignedAdminCount = data.users.filter(
    (user) =>
      user.roleStatus === "matched" && isAdminCapableRole(user.convexRole)
  ).length
  const mutation = useStaffMutation<
    ManagementActionRequest,
    StaffMutationResponse
  >({
    invalidate: ["billing", "management"],
    mutationFn: (request) =>
      managementClient.runAction<StaffMutationResponse>(request),
  })

  const columns = [
    {
      accessorKey: "displayName",
      cell: ({ row }: { row: { original: StaffManagementUserRecord } }) => (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="font-medium">{row.original.displayName}</div>
            {row.original.isCurrentUser ? (
              <DirectoryBadge variant="outline">Current session</DirectoryBadge>
            ) : null}
            {row.original.isReservedSuperAdmin ? (
              <DirectoryBadge variant="outline">
                Reserved super-admin
              </DirectoryBadge>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.email ?? row.original.clerkUserId}
          </div>
        </div>
      ),
      header: "User",
    },
    {
      accessorKey: "convexRole",
      cell: ({ row }: { row: { original: StaffManagementUserRecord } }) => (
        <RoleBadge role={row.original.convexRole} />
      ),
      header: "Convex",
    },
    {
      accessorKey: "clerkRole",
      cell: ({ row }: { row: { original: StaffManagementUserRecord } }) => (
        <RoleBadge role={row.original.clerkRole} />
      ),
      header: "Clerk",
    },
    {
      accessorKey: "roleStatus",
      cell: ({ row }: { row: { original: StaffManagementUserRecord } }) => (
        <RoleStatusBadge user={row.original} />
      ),
      header: "Status",
    },
    {
      accessorKey: "clerkUserId",
      header: "Clerk ID",
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: StaffManagementUserRecord } }) => {
        const allowedRoleOptions = getAllowedRoleOptionsForManagementUser({
          actorRole: data.currentActorRole,
          user: row.original,
        })
        const canBanTargetUser = canActorBanManagementUser({
          actorRole: data.currentActorRole,
          user: row.original,
        })
        const hasActions = allowedRoleOptions.length > 0 || canBanTargetUser

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={`Manage ${row.original.displayName}`}
                disabled={mutation.isPending || !hasActions}
                size="icon"
                variant="ghost"
              >
                <IconDotsVertical aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {allowedRoleOptions.map((role) => (
                  <DropdownMenuItem
                    disabled={
                      mutation.isPending || row.original.convexRole === role
                    }
                    key={role}
                    onClick={() =>
                      setPendingRoleChange({
                        nextRole: role,
                        user: row.original,
                      })
                    }
                  >
                    {buildRoleOptionLabel(role)}
                  </DropdownMenuItem>
                ))}
                {allowedRoleOptions.length > 0 && canBanTargetUser ? (
                  <DropdownMenuSeparator />
                ) : null}
                {canBanTargetUser ? (
                  <DropdownMenuItem
                    onClick={() => {
                      setPendingBanUser(row.original)
                    }}
                    variant="destructive"
                  >
                    <IconHammer aria-hidden="true" />
                    Ban user
                  </DropdownMenuItem>
                ) : null}
                {!hasActions ? (
                  <DropdownMenuItem disabled>
                    No permitted actions
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableGlobalFilter: false,
      header: "",
    },
  ]

  async function confirmRoleChange() {
    if (!pendingRoleChange) {
      return
    }

    try {
      const result = await mutation.mutateAsync({
        action: "updateUserRole",
        input: {
          nextRole: pendingRoleChange.nextRole,
          targetClerkUserId: pendingRoleChange.user.clerkUserId,
        },
      })

      toast.success(result.summary)

      setPendingRoleChange(null)
    } catch (error) {
      toast.error(
        error instanceof StaffClientError
          ? error.message
          : "Role update failed."
      )
    }
  }

  async function confirmBanUser() {
    if (!pendingBanUser) {
      return
    }

    try {
      const result = await mutation.mutateAsync({
        action: "banUser",
        input: {
          targetClerkUserId: pendingBanUser.clerkUserId,
        },
      })

      toast.success(result.summary)
      setPendingBanUser(null)
    } catch (error) {
      toast.error(
        error instanceof StaffClientError ? error.message : "Ban flow failed."
      )
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <StaffPageIntro
        description="Staff can ban standard user accounts. Admins can manage non-admin roles and may ban user or staff accounts. Super-admins can grant admin access and ban any non-super-admin account except themselves."
        title="Staff Management"
      />

      <StaffMetricStrip
        items={[
          { label: "Aligned operators", value: alignedAdminCount },
          { label: "Admins", value: data.adminCount },
          { label: "Super-admins", value: data.superAdminCount },
          { label: "Elevated users", value: data.staffCount },
        ]}
      />

      <StaffSection
        description="Search by name, email, or Clerk ID. The menu only shows role transitions that your current operator role is allowed to apply."
        title="Directory"
      >
        <StaffDataTable
          columns={columns}
          data={data.users}
          emptyDescription="No staff-manageable users are currently available."
          emptyTitle="No users found"
          getRowId={(row) => row.clerkUserId}
          searchPlaceholder="Search users, emails, or Clerk IDs"
        />
      </StaffSection>

      <StaffSection
        contentClassName="overflow-x-auto p-0 pr-3 pb-3"
        description="Recent role changes and failures captured for internal review."
        title="Role Audit Log"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.auditLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(log.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{log.actorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {log.actorClerkUserId}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xl whitespace-normal">
                  {log.summary}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      log.result === "success" ? "secondary" : "destructive"
                    }
                  >
                    {log.result}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StaffSection>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingRoleChange(null)
          }
        }}
        open={Boolean(pendingRoleChange)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm role change</DialogTitle>
            <DialogDescription>
              Review the guardrails below before changing this user&apos;s
              elevated access.
            </DialogDescription>
          </DialogHeader>

          {pendingRoleChange ? (
            <FieldGroup>
              <Field>
                <FieldLabel>Target user</FieldLabel>
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                  {pendingRoleChange.user.displayName}
                </div>
              </Field>

              <Field>
                <FieldLabel>Role transition</FieldLabel>
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                  {pendingRoleChange.user.convexRole ?? "missing"} to{" "}
                  {pendingRoleChange.nextRole}
                </div>
              </Field>

              {pendingRoleChange.nextRole === "admin" ? (
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-3 text-sm text-sky-100">
                  Only super-admins can grant or revoke admin access.
                </div>
              ) : null}

              {pendingRoleChange.user.roleStatus === "matched" &&
              isAdminCapableRole(pendingRoleChange.user.convexRole) &&
              !isAdminCapableRole(pendingRoleChange.nextRole) &&
              alignedAdminCount <= 1 ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                  This is the last aligned admin-capable account. Promote
                  another admin first.
                </div>
              ) : null}

              {pendingRoleChange.user.isReservedSuperAdmin ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-950 dark:text-amber-100">
                  <div className="flex items-center gap-2 font-medium">
                    <IconAlertTriangle />
                    Reserved role
                  </div>
                  <p className="mt-2 text-sm/relaxed">
                    This account is pinned as a super-admin by
                    `SUPER_ADMIN_DISCORD_IDS` and should be changed in
                    configuration instead of from the dashboard.
                  </p>
                </div>
              ) : null}

              {pendingRoleChange.user.roleStatus !== "matched" ? (
                <Field>
                  <FieldDescription>
                    This account is already out of sync. The update will attempt
                    to repair Clerk and Convex together.
                  </FieldDescription>
                </Field>
              ) : null}
            </FieldGroup>
          ) : null}

          <DialogFooter>
            <Button
              onClick={() => {
                setPendingRoleChange(null)
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                mutation.isPending ||
                Boolean(
                  pendingRoleChange?.user.roleStatus === "matched" &&
                  isAdminCapableRole(pendingRoleChange.user.convexRole) &&
                  !isAdminCapableRole(pendingRoleChange.nextRole) &&
                  alignedAdminCount <= 1
                )
              }
              onClick={() => {
                void confirmRoleChange()
              }}
            >
              {mutation.isPending ? "Saving..." : "Apply role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingBanUser(null)
          }
        }}
        open={Boolean(pendingBanUser)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban user</DialogTitle>
            <DialogDescription>
              This is a destructive moderation action. The user account will be
              blocked and their local data will be removed.
            </DialogDescription>
          </DialogHeader>

          {pendingBanUser ? (
            <FieldGroup>
              <Field>
                <FieldLabel>Target user</FieldLabel>
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                  {pendingBanUser.displayName}
                </div>
              </Field>

              <Alert variant="destructive">
                <IconAlertTriangle aria-hidden="true" />
                <AlertTitle>Ban hammer action</AlertTitle>
                <AlertDescription>
                  This will ban the Clerk account, cancel any Stripe
                  subscriptions without a refund, delete the Stripe customer,
                  and remove the user&apos;s CodStats data.
                </AlertDescription>
              </Alert>

              {pendingBanUser.status === "disabled" ? (
                <Field>
                  <FieldDescription>
                    This user is already disabled locally. The ban flow will
                    still remove any remaining data and billing records.
                  </FieldDescription>
                </Field>
              ) : null}

              {!canActorBanManagementUser({
                actorRole: data.currentActorRole,
                user: pendingBanUser,
              }) ? (
                <Alert variant="destructive">
                  <IconAlertTriangle aria-hidden="true" />
                  <AlertTitle>Ban blocked</AlertTitle>
                  <AlertDescription>
                    {getBanRestrictionMessageForManagementUser({
                      actorRole: data.currentActorRole,
                      user: pendingBanUser,
                    })}
                  </AlertDescription>
                </Alert>
              ) : null}
            </FieldGroup>
          ) : null}

          <DialogFooter>
            <Button
              onClick={() => {
                setPendingBanUser(null)
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                mutation.isPending ||
                !pendingBanUser ||
                !canActorBanManagementUser({
                  actorRole: data.currentActorRole,
                  user: pendingBanUser,
                })
              }
              onClick={() => {
                void confirmBanUser()
              }}
              variant="destructive"
            >
              <IconHammer aria-hidden="true" />
              {mutation.isPending ? "Banning..." : "Ban user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
