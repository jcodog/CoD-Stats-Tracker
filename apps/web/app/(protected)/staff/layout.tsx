import type { ReactNode } from "react"

import { roleMeetsRequirement } from "@workspace/backend/convex/lib/staffRoles"
import { StaffAccessState } from "@/features/staff/components/StaffAccessState"
import { StaffRouteTabs } from "@/features/staff/components/StaffRouteTabs"
import { requireStaffAccess } from "@/lib/server/staff-auth"

export default async function StaffLayout({
  children,
}: {
  children: ReactNode
}) {
  const access = await requireStaffAccess()

  if (!access.ok) {
    return <StaffAccessState access={access} />
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <StaffRouteTabs
        showManagement={roleMeetsRequirement(access.convexRole, "admin")}
      />
      {children}
    </div>
  )
}
