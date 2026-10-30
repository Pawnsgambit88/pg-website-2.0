'use client'

import { useMediaQuery } from '@/lib/hooks/useMediaQuery'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * `true` when the user asks for less motion (ARCH-001 13.5, 15). CSS already removes transitions under this query
 * (base.css); use the hook for behaviour CSS cannot reach: carousel autoplay, scripted scrolling, reveal observers.
 *
 * Server and first client render report `false` (motion allowed), matching what the CSS does without JavaScript. Do not
 * start motion in render or in an effect that ran before hydration finished; read the value inside the effect.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION, false)
}
