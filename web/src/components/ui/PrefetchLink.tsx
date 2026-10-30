'use client'

import Link from 'next/link'
import { useState, type ComponentProps, type FocusEvent, type PointerEvent } from 'react'

type PrefetchLinkProps = Omit<ComponentProps<typeof Link>, 'prefetch'>

/**
 * Intent-based route preload (RBP bundle-preload, ARCH-001 14). `next/link` prefetches every link that scrolls into
 * view (production only), which is wasteful for long lists and menus. This wrapper prefetches nothing until the user
 * shows intent (pointer enters or touches, or keyboard focus), then restores Next's default prefetch for that one
 * link (`prefetch={null}`: the full route when static, down to the `loading.tsx` boundary when dynamic).
 * Use it for link-dense surfaces (footer, admin tables, card grids). Primary navigation keeps plain `next/link`.
 */
export function PrefetchLink({ onPointerEnter, onFocus, ...props }: PrefetchLinkProps) {
  const [intent, setIntent] = useState(false)

  function handlePointerEnter(event: PointerEvent<HTMLAnchorElement>) {
    setIntent(true)
    onPointerEnter?.(event)
  }

  function handleFocus(event: FocusEvent<HTMLAnchorElement>) {
    setIntent(true)
    onFocus?.(event)
  }

  return <Link {...props} prefetch={intent ? null : false} onPointerEnter={handlePointerEnter} onFocus={handleFocus} />
}
