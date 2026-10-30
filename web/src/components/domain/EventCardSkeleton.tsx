import { Skeleton } from '@/components/ui/feedback/Skeleton'

/** Loading shape of EventCard at the same ratio and padding, so the grid does not shift. Wrap in a SkeletonRegion. */
export function EventCardSkeleton() {
  return (
    <div className="flex min-w-0 flex-col border border-line bg-parchment-soft" aria-hidden="true">
      <Skeleton shape="block" className="aspect-16/9 h-auto rounded-none" />
      <div className="flex flex-col gap-3 p-4 sm:p-6">
        <Skeleton shape="line" className="w-2/3" />
        <Skeleton shape="line" className="h-6 w-full" />
        <Skeleton shape="line" lines={2} />
        <Skeleton shape="line" className="w-1/2" />
      </div>
    </div>
  )
}
