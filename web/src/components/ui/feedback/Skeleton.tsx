import { cn } from '@/lib/cn'

/**
 * Placeholder shape.
 *  line    one line of text (16px tall); with `lines` > 1 the stack ends in a shorter line, like a paragraph
 *  block   a rectangle (images, charts, tiles); give it the real size through `className` so layout does not shift
 *  card    a bordered panel-sized rectangle (160px tall by default)
 *  circle  an avatar (40px)
 */
export type SkeletonShape = 'line' | 'block' | 'card' | 'circle'

const SHAPE_CLASS: Record<SkeletonShape, string> = {
  line: 'h-4 w-full',
  block: 'h-24 w-full',
  card: 'h-40 w-full border border-line',
  circle: 'size-10 rounded-full',
}

interface SkeletonProps {
  shape?: SkeletonShape
  /** Number of text lines (shape `line` only). Default 1. */
  lines?: number
  /**
   * Size and layout additions (height, width, aspect ratio, margin). Match the content that will replace the skeleton
   * so the page does not jump (CLS). Utilities here override the shape default.
   */
  className?: string
}

const MAX_LINES = 12

/**
 * Token-coloured loading placeholder (ARCH-001 13, DoD-S). Always `aria-hidden`: it carries no information. Wrap a
 * group of skeletons in `SkeletonRegion` so assistive technology hears a single "Loading" status per region, never one
 * per block. The pulse runs only under `motion-safe`, so reduced motion gets a still block. Server Component.
 */
export function Skeleton({ shape = 'block', lines = 1, className }: SkeletonProps) {
  const base = 'bg-sand motion-safe:animate-pulse'
  if (shape === 'line' && lines > 1) {
    const count = Math.min(Math.floor(lines), MAX_LINES)
    return (
      <div aria-hidden="true" className={cn('flex flex-col gap-2', className)}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={cn(base, 'rounded-public', SHAPE_CLASS.line, index === count - 1 && 'w-2/3')} />
        ))}
      </div>
    )
  }
  return (
    <div
      aria-hidden="true"
      className={cn(base, shape === 'circle' ? '' : 'rounded-public', SHAPE_CLASS[shape], className)}
    />
  )
}
