import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Icon size on screen. The artwork is always drawn on a 24 viewBox; this only scales it.
 *  sm  16px (inline with small text, badges)
 *  md  20px (default: buttons, links, list rows)
 *  lg  24px (standalone icon buttons, empty-state glyphs)
 */
export type IconSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<IconSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
}

/** Props every icon module accepts. */
export interface IconProps {
  size?: IconSize
  /**
   * Accessible name. Omit for a decorative icon (the default: `aria-hidden`, next to visible text). Provide it only when
   * the icon stands alone and carries meaning; an icon-only button should name the BUTTON instead (`IconButton label`).
   */
  title?: string
  /** Layout additions only (margin, colour). The stroke follows `currentColor`. */
  className?: string
}

interface IconBaseProps extends IconProps {
  /** SVG shapes in the 24x24 box, coordinates at 1 to 2 decimals (RBP rendering-svg-precision). */
  children: ReactNode
}

/**
 * Shared frame for the in-house icon set (ARCH-001 13.4): 24 viewBox, no fill, `currentColor` stroke 1.5, square caps and
 * mitred joins to match the 2px-radius language. Server Component, no state. Each icon is its own module under
 * components/ui/icons and is imported by path (no barrel, no icon package: RBP bundle-barrel-imports), so a page ships
 * only the icons it renders. To animate, wrap the icon in a span: do not animate SVG elements (rendering-animate-svg-wrapper).
 */
export function IconBase({ size = 'md', title, className, children }: IconBaseProps) {
  const named = title !== undefined && title !== ''
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      focusable="false"
      role={named ? 'img' : undefined}
      aria-label={named ? title : undefined}
      aria-hidden={named ? undefined : true}
      className={cn('shrink-0', SIZE_CLASS[size], className)}
    >
      {children}
    </svg>
  )
}
