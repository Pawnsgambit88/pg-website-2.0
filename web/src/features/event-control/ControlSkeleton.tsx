import { Skeleton } from '@/components/ui/feedback/Skeleton'

/** Mirrors the frame: header block, then the 2x2 (mobile) summary strip. */
export function ControlSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton shape="card" className="h-24" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Skeleton shape="card" className="h-24" />
        <Skeleton shape="card" className="h-24" />
        <Skeleton shape="card" className="h-24" />
        <Skeleton shape="card" className="h-24" />
      </div>
    </div>
  )
}
