import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder for a settings section while its data streams in; the header and section nav stay visible. */
export function SettingsSectionSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Cargando">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  )
}
