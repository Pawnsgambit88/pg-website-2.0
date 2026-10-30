import { Surface } from '@/components/ui/Surface'
import { Skeleton } from '@/components/ui/feedback/Skeleton'

export function NextUpSkeleton() {
  return (
    <Surface padding="lg" className="flex flex-col gap-4">
      <Skeleton shape="line" className="w-24" />
      <Skeleton shape="line" className="h-8 w-2/3" />
      <Skeleton shape="line" lines={2} />
      <Skeleton className="h-12 w-full sm:w-56" />
    </Surface>
  )
}
