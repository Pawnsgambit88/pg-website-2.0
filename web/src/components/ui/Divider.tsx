import { cn } from '@/lib/cn'

/** `line` is the hairline on light surfaces, `light` on forest, `admin` on admin-bg and admin-panel. */
export type DividerTone = 'line' | 'light' | 'admin'

const TONE_CLASS: Record<DividerTone, string> = {
  line: 'border-line',
  light: 'border-line-light',
  admin: 'border-line-admin',
}

interface DividerProps {
  tone?: DividerTone
  /** Default true: a purely visual rule is hidden from assistive technology. Pass false for a real thematic break. */
  decorative?: boolean
  className?: string
}

/** Horizontal hairline (decorative, about 1.3:1 contrast, so never the only cue). */
export function Divider({ tone = 'line', decorative = true, className }: DividerProps) {
  return (
    <hr aria-hidden={decorative ? true : undefined} className={cn('border-0 border-t', TONE_CLASS[tone], className)} />
  )
}
