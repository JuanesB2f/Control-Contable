"use client"

import { createContext, useContext } from "react"

import type { Organization, OrganizationSummary } from "@/modules/organizations/domain/types"

import type { AppRole, Permission } from "../domain/permissions"

export type OrgClientContext = {
  organization: Organization
  role: AppRole
  permissions: Permission[]
  user: { id: string; email: string; fullName: string | null; avatarUrl: string | null }
  organizations: OrganizationSummary[]
}

const OrgContext = createContext<OrgClientContext | null>(null)

export function OrgProvider({ value, children }: { value: OrgClientContext; children: React.ReactNode }) {
  return <OrgContext value={value}>{children}</OrgContext>
}

export function useOrg() {
  const context = useContext(OrgContext)
  if (!context) throw new Error("useOrg must be used within an OrgProvider")
  return context
}

/** UI-only permission check. Server Actions and RLS enforce the real authorization. */
export function useCan() {
  const { permissions } = useOrg()
  return (permission: Permission) => permissions.includes(permission)
}
