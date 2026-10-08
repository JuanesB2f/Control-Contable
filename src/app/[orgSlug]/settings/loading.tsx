import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy aria-label="Cargando">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  )
}
