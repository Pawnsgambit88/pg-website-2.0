import { Skeleton } from '@/components/ui/feedback/Skeleton'

/** Mirrors the dashboard's first section so the page does not jump when data arrives. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton shape="card" className="h-24" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton shape="card" className="h-28" />
        <Skeleton shape="card" className="h-28" />
      </div>
    </div>
  )
}
