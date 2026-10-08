import type { AppRole } from "@/modules/access/domain/permissions"
import type { Tables } from "@/types/database"

export type Organization = Pick<
  Tables<"organizations">,
  "id" | "name" | "slug" | "business_type" | "country" | "currency" | "timezone" | "locale" | "created_at"
>

export type OrganizationSummary = Pick<Organization, "id" | "name" | "slug"> & { role: AppRole }
