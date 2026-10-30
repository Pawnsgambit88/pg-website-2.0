'use client'

import { useEffect, useRef, useState } from 'react'
import { remainingMs } from '@/features/registration/waitlist'

/**
 * Milliseconds left until `expiresAt`, measured from the server's `serverNow` plus the browser's monotonic elapsed time
 * (`performance.now`), so the device clock is never trusted. It re-anchors whenever the server sends a new pair and
 * re-reads on `visibilitychange` (timers are throttled in hidden tabs, the monotonic clock is not). `onExpire` runs once
 * per pair when the value reaches zero; it should re-read the server, which decides what the expiry means.
 */
export function useServerCountdown(expiresAt: string, serverNow: string, onExpire: () => void): number {
  const [left, setLeft] = useState(() => remainingMs(expiresAt, serverNow, 0))
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    const anchor = performance.now()
    let fired = false
    const tick = () => {
      const value = remainingMs(expiresAt, serverNow, performance.now() - anchor)
      setLeft(value)
      if (value <= 0 && !fired) {
        fired = true
        onExpireRef.current()
      }
    }
    // A pair that is already expired on arrival still gets one tick, so the expiry path runs.
    const first = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [expiresAt, serverNow])

  return left
}
