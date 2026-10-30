import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { SkeletonRegion } from '@/components/ui/feedback/SkeletonRegion'

/**
 * Group `loading.tsx` body for the client groups: streams at once while the dynamic shell resolves (ARCH-001 7.5).
 * One `SkeletonRegion` (aria-busy, a single "Loading" status) around token-coloured placeholders that reserve the
 * heading and intro space; the pulse runs only under `motion-safe`. Per-section skeletons belong to the screens that own them.
 */
export function RouteLoading() {
  return (
    <div className="shell py-12">
      <SkeletonRegion>
        <Skeleton shape="line" className="h-8 w-2/3 max-w-sm" />
        <Skeleton shape="line" lines={3} className="mt-4 max-w-prose" />
      </SkeletonRegion>
    </div>
  )
}
