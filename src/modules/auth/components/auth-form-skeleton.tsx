import { Skeleton } from "@/components/ui/skeleton"

export function AuthFormSkeleton({ fields }: { fields: number }) {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
        </div>
      ))}
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  )
}
