import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { OrgContext } from "@/modules/access/application/org-context"

import { describeAuditEntry, type AuditEntry, type AuditTone } from "../domain/describe"

export type ActivityItem = {
  id: number
  summary: string
  tone: AuditTone
  createdAt: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export async function getRecentActivity(context: OrgContext, limit = 50): Promise<ActivityItem[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity, entity_id, metadata, created_at, actor:profiles!audit_logs_user_id_fkey(full_name, email)")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  const memberIds = [
    ...new Set(data.filter((row) => row.entity === "member" && row.entity_id).map((row) => row.entity_id as string)),
  ]
  const { data: subjects, error: subjectsError } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", memberIds)
    : { data: [], error: null }
  if (subjectsError) throw subjectsError

  const names = new Map(subjects.map((profile) => [profile.id, profile.full_name ?? profile.email ?? "un miembro"]))
  const subjectName = (userId: string | null) => (userId && names.get(userId)) || "un miembro"

  return data.map((row) => {
    const entry: AuditEntry = {
      id: row.id,
      action: row.action,
      entityId: row.entity_id,
      metadata: asRecord(row.metadata),
      createdAt: row.created_at,
      actorName: row.actor?.full_name ?? row.actor?.email ?? null,
    }
    return { id: row.id, createdAt: row.created_at, ...describeAuditEntry(entry, subjectName) }
  })
}
