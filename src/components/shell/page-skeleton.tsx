import { PageContainer } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"

/** Generic loading state for a page: header plus a grid of cards. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <PageContainer>
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <Skeleton key={index} className="h-36 rounded-2xl" />
        ))}
      </div>
    </PageContainer>
  )
}
